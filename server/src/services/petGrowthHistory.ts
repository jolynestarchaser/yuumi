import type { ClientSession } from 'mongoose';
import { createHash } from 'node:crypto';
import PetGrowthRecord from '../models/PetGrowthRecord.js';
import type { PetGrowthEvent, PetHistoryPage, StoredCompanion } from '../../../shared/contracts.js';

const fail = (message: string) => Object.assign(new Error(message), { status: 400 });
const encode = (companionId: string, pending: boolean, sequence: number) => Buffer.from(JSON.stringify({ companionId, pending, sequence })).toString('base64url');
export function historyCursor(companionId: string, sequence: number) { return encode(companionId, false, sequence); }

/** Called in the same transaction as pet state and operation receipt. */
export async function persistPetGrowth(state: StoredCompanion, session: ClientSession, ackIds: string[] = [], now = new Date()): Promise<StoredCompanion> {
  if (!state.progression) { if (ackIds.length) throw fail('Choose existing growth events.'); return state; }
  const next = { ...state, progression: structuredClone(state.progression) };
  const p = next.progression;
  for (const event of p.events) {
    const audit = p.audit.filter((entry) => entry.id === event.planId || entry.id.startsWith(`${event.planId}:`));
    const eventHash = createHash('sha256').update(JSON.stringify({ ...event, acknowledgedAt: null })).digest('hex');
    // A conflicting immutable snapshot hits the unique key and aborts the transaction.
    await PetGrowthRecord.updateOne({ companionId: String(state._id), eventId: event.growthEventId, eventHash }, {
      $setOnInsert: { familyId: state.familyId, companionId: String(state._id), eventId: event.growthEventId,
        presentationSequence: event.presentationSequence, eventHash, event, audit, acknowledgedAt: event.acknowledgedAt },
    }, { upsert: true, session });
  }
  if (ackIds.length) {
    const unique = [...new Set(ackIds)];
    const filter = { familyId: state.familyId, companionId: String(state._id), eventId: { $in: unique } };
    const count = await PetGrowthRecord.countDocuments(filter).session(session);
    if (count !== unique.length) throw fail('Choose existing growth events belonging to this companion.');
    await PetGrowthRecord.updateMany({ ...filter, acknowledgedAt: null }, { $set: { acknowledgedAt: now, 'event.acknowledgedAt': now } }, { session });
    p.events = p.events.map((event) => unique.includes(event.growthEventId) ? { ...event, acknowledgedAt: event.acknowledgedAt || now } : event);
  }
  p.presentationSequence = Math.max(p.presentationSequence || 0, ...p.events.map((event) => event.presentationSequence));
  p.events = p.events.slice(-100);
  // Audits are removed only after durable events containing them have been stored.
  const storedPlanIds = new Set(state.progression.events.map((event) => event.planId));
  p.audit = p.audit.filter((entry) => ![...storedPlanIds].some((id) => entry.id === id || entry.id.startsWith(`${id}:`)));
  p.historyStored = true;
  return next;
}

export async function readPetHistory(familyId: string, companionId: string, pending = false, cursor?: string, requestedLimit?: unknown): Promise<PetHistoryPage> {
  const limit = requestedLimit === undefined ? 25 : Number(requestedLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw fail('History page size must be between 1 and 100.');
  let sequence: number | null = null;
  if (cursor !== undefined) {
    try {
      if (typeof cursor !== 'string' || cursor.length > 500) throw fail('Invalid cursor.');
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
      if (parsed.companionId !== companionId || parsed.pending !== pending || !Number.isSafeInteger(parsed.sequence) || parsed.sequence < 1) throw fail('Invalid cursor.');
      sequence = parsed.sequence;
    } catch { throw fail('Choose a valid history cursor.'); }
  }
  const rows = await PetGrowthRecord.find({ familyId, companionId, ...(pending ? { acknowledgedAt: null } : {}),
    ...(sequence === null ? {} : { presentationSequence: pending ? { $gt: sequence } : { $lt: sequence } }),
  }).sort({ presentationSequence: pending ? 1 : -1 }).limit(limit + 1).lean();
  const page = rows.slice(0, limit);
  return { events: page.map((row) => ({ ...row.event as PetGrowthEvent, acknowledgedAt: row.acknowledgedAt })),
    nextCursor: rows.length > limit ? encode(companionId, pending, page.at(-1)!.presentationSequence) : null };
}
