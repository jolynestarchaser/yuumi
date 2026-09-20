import { createHash } from 'node:crypto';
import type { Profile } from '../../../shared/contracts.js';

export interface CompanionMutationIdentity {
  familyId: string;
  companionId: string;
  operationId: string;
  actor: Profile | 'system';
  payloadHash: string;
}

function canonical(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Mutation payload contains an invalid number.');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, canonical(entry)]));
  throw new Error('Mutation payload contains an unsupported value.');
}

export function companionPayloadHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(payload))).digest('hex');
}

export function mutationIdentity(familyId: string, companionId: string, operationId: string, actor: Profile | 'system', payload: unknown): CompanionMutationIdentity {
  return { familyId, companionId, operationId, actor, payloadHash: companionPayloadHash(payload) };
}

export function assertReceiptPayload(receipt: { payloadHash: string; actor: string }, identity: CompanionMutationIdentity): void {
  if (receipt.payloadHash !== identity.payloadHash || receipt.actor !== identity.actor) {
    throw Object.assign(new Error('That operation ID was already used with different content.'), { status: 409 });
  }
}
