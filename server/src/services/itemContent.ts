import mongoose from 'mongoose';
import Item from '../models/Item.js';
import ItemOperation from '../models/ItemOperation.js';
import type { Actor } from '../../../shared/contracts.js';
import { assertTravelMapContent } from './travelMap.js';
import { itemSnapshot, revisionService } from './historyService.js';

const writableFields = ['name', 'content', 'url', 'metadata', 'size', 'appearance', 'secret', 'secretLabel'] as const;
const OPERATION_ID = /^[a-zA-Z0-9-]{10,80}$/;
type WritableField = typeof writableFields[number];

export class ItemRevisionConflict extends Error {
  current: unknown;
  constructor(current: unknown) {
    super('This item changed elsewhere.');
    this.current = current;
  }
}

export function contentPatch(input: Record<string, unknown>) {
  const patch: Partial<Record<WritableField, unknown>> = {};
  for (const field of writableFields) if (input[field] !== undefined) patch[field] = input[field];
  return patch;
}

function assertWriteContract(expectedRevision: number, operationId?: string) {
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw Object.assign(new Error('Expected revision must be a non-negative integer.'), { status: 400 });
  if (operationId !== undefined && !OPERATION_ID.test(operationId)) throw Object.assign(new Error('A valid operation ID is required.'), { status: 400 });
}

export async function updateItemContent({ id, expectedRevision, patch, actor, session }: { id: string; expectedRevision: number; patch: Record<string, unknown>; actor: Actor; session?: mongoose.ClientSession }) {
  if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error('Invalid item ID'), { status: 400 });
  assertWriteContract(expectedRevision);
  const fields = contentPatch(patch);
  const currentQuery = () => Item.findOne({ _id: id, deletedAt: null }, null, session ? { session } : undefined);
  if (!Object.keys(fields).length) {
    const current = await currentQuery();
    if (!current) throw Object.assign(new Error('Item not found.'), { status: 404 });
    return current;
  }
  if (fields.content !== undefined) {
    if (typeof fields.content !== 'string') throw Object.assign(new Error('Content must be text.'), { status: 400 });
    const current = await currentQuery().select('type');
    if (!current) throw Object.assign(new Error('Item not found.'), { status: 404 });
    if (current.type === 'map') assertTravelMapContent(fields.content);
    else if (fields.content.length > 10000) throw Object.assign(new Error('Content must be 10,000 characters or fewer.'), { status: 400 });
  }
  const revisionFilter = expectedRevision === 0
    ? { $or: [{ contentRevision: 0 }, { contentRevision: { $exists: false } }] }
    : { contentRevision: expectedRevision };
  const item = await Item.findOneAndUpdate(
    { _id: id, deletedAt: null, ...revisionFilter },
    { $set: { ...fields, updatedBy: actor }, $inc: { contentRevision: 1 } },
    { new: true, runValidators: true, ...(session ? { session } : {}) }
  );
  if (item) return item;
  const current = await Item.findById(id, null, session ? { session } : undefined);
  if (!current) throw Object.assign(new Error('Item not found.'), { status: 404 });
  if (current.deletedAt) throw Object.assign(new Error('Item is in Trash.'), { status: 410 });
  throw new ItemRevisionConflict(current);
}

export async function commitItemContent({ id, expectedRevision, operationId, patch, actor, operation = 'update', restoredFromRevision = null }: { id: string; expectedRevision: number; operationId: string; patch: Record<string, unknown>; actor: Actor; operation?: 'update' | 'restore'; restoredFromRevision?: number | null }) {
  if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error('Invalid item ID'), { status: 400 });
  assertWriteContract(expectedRevision, operationId);
  const key = { entityId: id, actor, operationId };
  const prior = await ItemOperation.findOne(key).lean();
  if (prior) return { item: prior.response, replay: true };
  const session = await mongoose.startSession();
  let response;
  try {
    await session.withTransaction(async () => {
      const replay = await ItemOperation.findOne(key, null, { session }).lean();
      if (replay) { response = replay.response; return; }
      const item = await updateItemContent({ id, expectedRevision, patch, actor, session });
      response = item.toObject ? item.toObject() : item;
      await revisionService.record({ entityType: 'item', entityId: item._id, revision: item.contentRevision, operation, actor, snapshot: itemSnapshot(item), restoredFromRevision, session });
      await ItemOperation.create([{ ...key, operation, revision: item.contentRevision, response }], { session });
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      const replay = await ItemOperation.findOne(key).lean();
      if (replay) return { item: replay.response, replay: true };
    }
    throw error;
  } finally {
    await session.endSession();
  }
  return { item: response, replay: false };
}
