import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Companion from '../models/Companion.js';
import CompanionFamily from '../models/CompanionFamily.js';
import CompanionOperation from '../models/CompanionOperation.js';
import { COMPANION_FAMILY_ID, COMPANION_KEY, initialCompanion, publicCompanion, settledState } from './companionState.js';
import { companionCapabilities } from './companionBrain.js';
import { ensureCompanionFamily, migrateCompanion } from './companionMigration.js';
import type { Profile, StoredCompanion, PublicCompanion } from '../../../shared/contracts.js';

export const ACTIVE_COMPANION_LIMIT = 6;
export const OPERATION_ID_REGEX = /^[a-zA-Z0-9-]{10,80}$/;

export function hashPayload(payload: unknown): string {
  const normalized = JSON.stringify(payload ?? {});
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function fail(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export async function withFamilyLock<T>(change: (family: any, token: string) => Promise<T>): Promise<T> {
  await ensureCompanionFamily();
  const token = crypto.randomUUID();
  const family = await CompanionFamily.findOneAndUpdate(
    { _id: COMPANION_FAMILY_ID, lockedUntil: { $lte: new Date() } },
    { $set: { lockToken: token, lockedUntil: new Date(Date.now() + 20000) } },
    { new: true }
  ).lean();
  if (!family) throw fail(409, 'Your companion family is busy. Please try again shortly.');
  try {
    return await change(family, token);
  } finally {
    await CompanionFamily.updateOne(
      { _id: COMPANION_FAMILY_ID, lockToken: token },
      { $set: { lockedUntil: new Date(0) }, $unset: { lockToken: 1 } }
    ).catch(() => {});
  }
}

export async function withCompanionLock<T>(
  companionId: string,
  change: (state: StoredCompanion, token: string) => Promise<T>
): Promise<T> {
  if (companionId === COMPANION_KEY) {
    try {
      await Companion.updateOne(
        { _id: COMPANION_KEY },
        { $setOnInsert: { ...initialCompanion(), _id: COMPANION_KEY } },
        { upsert: true }
      );
    } catch (error: any) {
      if (error.code !== 11000) throw error;
    }
    await migrateCompanion(COMPANION_KEY);
  } else {
    const migrated = await migrateCompanion(companionId);
    if (!migrated) throw fail(404, 'That companion could not be found.');
  }

  const token = crypto.randomUUID();
  const state = await Companion.findOneAndUpdate(
    { _id: companionId, lockedUntil: { $lte: new Date() } },
    { $set: { lockToken: token, lockedUntil: new Date(Date.now() + 180000) } },
    { new: true }
  ).lean();
  if (!state) throw fail(409, 'Your companion is busy with another moment. Please try again shortly.');

  try {
    return await change(state as StoredCompanion, token);
  } finally {
    await Companion.updateOne(
      { _id: companionId, lockToken: token },
      { $set: { lockedUntil: new Date(0) }, $unset: { lockToken: 1 } }
    ).catch(() => {});
  }
}

export interface ExecuteMutationOptions {
  familyId?: string;
  companionId: string;
  operationId: string;
  actor: Profile | 'system' | 'unknown';
  action: string;
  payload: unknown;
  mutate: (state: StoredCompanion) => Promise<StoredCompanion> | StoredCompanion;
}

export async function executeCompanionMutation(options: ExecuteMutationOptions): Promise<{ companion: PublicCompanion; capabilities: ReturnType<typeof companionCapabilities> }> {
  const { familyId = COMPANION_FAMILY_ID, companionId, operationId, actor, action, payload, mutate } = options;
  const payloadHash = hashPayload(payload);
  const isDbConnected = mongoose.connection.readyState === 1;

  // Check durable receipt first if MongoDB is connected
  if (isDbConnected) {
    const existingReceipt = await CompanionOperation.findOne({ familyId, companionId, operationId }).lean();
    if (existingReceipt) {
      if (existingReceipt.payloadHash !== payloadHash) {
        throw fail(400, 'Payload does not match the original request for this operation ID.');
      }
      return existingReceipt.response as { companion: PublicCompanion; capabilities: ReturnType<typeof companionCapabilities> };
    }
  }

  // Execute mutation under companion lease
  return await withCompanionLock(companionId, async (state, token) => {
    // In-memory / document-level replay check
    if (state.recentOperations?.includes(operationId)) {
      return {
        companion: publicCompanion(state),
        capabilities: companionCapabilities(),
      };
    }

    if (isDbConnected) {
      const innerReceipt = await CompanionOperation.findOne({ familyId, companionId, operationId }).lean();
      if (innerReceipt) {
        if (innerReceipt.payloadHash !== payloadHash) {
          throw fail(400, 'Payload does not match the original request for this operation ID.');
        }
        return innerReceipt.response as { companion: PublicCompanion; capabilities: ReturnType<typeof companionCapabilities> };
      }
    }

    // Run mutation on settled state
    const nextState = await mutate(settledState(state));
    const nextRevision = (state.revision || 0) + 1;
    const now = new Date();

    const { _id, __v, lockToken, lockedUntil, budget, ...fieldsToUpdate } = nextState;

    const responseSnapshot = {
      companion: publicCompanion({ ...nextState, revision: nextRevision }, now),
      capabilities: companionCapabilities(),
    };

    if (isDbConnected) {
      const mongoSession = await mongoose.startSession().catch(() => null);
      try {
        if (mongoSession && typeof mongoSession.withTransaction === 'function') {
          await mongoSession.withTransaction(async () => {
            const updated = await Companion.findOneAndUpdate(
              { _id: companionId, lockToken: token },
              {
                $set: {
                  ...fieldsToUpdate,
                  updatedAt: now,
                  revision: nextRevision,
                  recentOperations: [...(state.recentOperations || []), operationId].slice(-60),
                },
              },
              { session: mongoSession, new: true, runValidators: true }
            ).lean();
            if (!updated) throw fail(409, 'This moment expired before it could be saved. Please retry.');

            await CompanionOperation.create(
              [
                {
                  familyId,
                  companionId,
                  operationId,
                  actor,
                  action,
                  payloadHash,
                  revision: nextRevision,
                  response: responseSnapshot,
                },
              ],
              { session: mongoSession }
            );
          });
        } else {
          const updated = await Companion.findOneAndUpdate(
            { _id: companionId, lockToken: token },
            {
              $set: {
                ...fieldsToUpdate,
                updatedAt: now,
                revision: nextRevision,
                recentOperations: [...(state.recentOperations || []), operationId].slice(-60),
              },
            },
            { new: true, runValidators: true }
          ).lean();
          if (!updated) throw fail(409, 'This moment expired before it could be saved. Please retry.');

          await CompanionOperation.create({
            familyId,
            companionId,
            operationId,
            actor,
            action,
            payloadHash,
            revision: nextRevision,
            response: responseSnapshot,
          });
        }
      } finally {
        if (mongoSession) {
          await mongoSession.endSession().catch(() => {});
        }
      }
    } else {
      // Mock / standalone test environment
      const updated = await Companion.findOneAndUpdate(
        { _id: companionId, lockToken: token },
        {
          $set: {
            ...fieldsToUpdate,
            updatedAt: now,
            revision: nextRevision,
            recentOperations: [...(state.recentOperations || []), operationId].slice(-60),
          },
        },
        { new: true, runValidators: true }
      ).lean();
      if (!updated) throw fail(409, 'This moment expired before it could be saved. Please retry.');
    }

    return responseSnapshot;
  });
}
