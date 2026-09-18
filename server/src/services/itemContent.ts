import mongoose from 'mongoose';
import Item from '../models/Item.js';
import type { Actor } from '../../../shared/contracts.js';
import { assertTravelMapContent } from './travelMap.js';

const writableFields = ['name', 'content', 'url', 'metadata', 'size', 'appearance', 'secret', 'secretLabel'] as const;
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

export async function updateItemContent({ id, expectedRevision, patch, actor }: { id: string; expectedRevision?: number; patch: Record<string, unknown>; actor: Actor }) {
  if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error('Invalid item ID'), { status: 400 });
  if (expectedRevision !== undefined && (!Number.isInteger(expectedRevision) || expectedRevision < 0)) throw Object.assign(new Error('Expected revision must be a non-negative integer.'), { status: 400 });
  const fields = contentPatch(patch);
  if (!Object.keys(fields).length) {
    const current = await Item.findOne({ _id: id, deletedAt: null });
    if (!current) throw Object.assign(new Error('Item not found.'), { status: 404 });
    return current;
  }
  if (fields.content !== undefined) {
    const current = await Item.findOne({ _id: id, deletedAt: null }).select('type');
    if (!current) throw Object.assign(new Error('Item not found.'), { status: 404 });
    if (current.type === 'map') assertTravelMapContent(fields.content);
  }
  const filter: Record<string, unknown> = { _id: id, deletedAt: null };
  if (expectedRevision !== undefined) filter.contentRevision = expectedRevision;
  const item = await Item.findOneAndUpdate(filter, { $set: { ...fields, updatedBy: actor }, $inc: { contentRevision: 1 } }, { new: true, runValidators: true });
  if (item) return item;
  const current = await Item.findById(id);
  if (!current) throw Object.assign(new Error('Item not found.'), { status: 404 });
  if (current.deletedAt) throw Object.assign(new Error('Item is in Trash.'), { status: 410 });
  throw new ItemRevisionConflict(current);
}
