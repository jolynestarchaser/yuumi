import { giphyIdFromUrl } from './giphy.js';
import type { MessageAttachmentInput, Profile } from '../../../shared/contracts.js';

export type UrlAttachmentRequest = {
  sourceUrl: string;
  operationId: string;
  generation: number;
  status: 'pending' | 'failed';
};

export function isGiphyUrl(value: string): boolean {
  try { return ['giphy.com', 'www.giphy.com', 'media.giphy.com'].includes(new URL(value.trim()).hostname.toLowerCase()); } catch { return false; }
}

export function attachmentFromProviderUrl(value: string): MessageAttachmentInput | undefined {
  const trimmed = value.trim();
  const gifId = giphyIdFromUrl(trimmed);
  if (gifId) return { kind: 'giphy', gifId };
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'https:' && url.hostname.toLowerCase() === 'open.spotify.com') return { kind: 'spotify', spotifyUrl: trimmed };
  } catch { /* The server will return the localized URL error for remote imports. */ }
  return undefined;
}

export function isRemoteMediaCandidate(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && !isGiphyUrl(value) && !attachmentFromProviderUrl(value);
  } catch { return false; }
}

export function isMessageSendBlocked({ body, hasAttachment, urlValue, resolvedUrlAttachment, resolving }: { body: string; hasAttachment: boolean; urlValue: string; resolvedUrlAttachment: boolean; resolving: boolean }): boolean {
  if (resolving || (urlValue.trim().length > 0 && !resolvedUrlAttachment)) return true;
  return !body.trim() && !hasAttachment;
}

export type PendingMessageOperation = { signature: string; operationId: string };

export function messageOperationForSnapshot(previous: PendingMessageOperation | null, profile: Profile, snapshot: unknown, createOperationId: () => string): PendingMessageOperation {
  const signature = JSON.stringify(snapshot);
  return previous?.signature === signature ? previous : { signature, operationId: `${profile}-${createOperationId()}` };
}

export function beginUrlAttachmentRequest(previous: UrlAttachmentRequest | null, profile: Profile, sourceUrl: string, createOperationId: () => string): UrlAttachmentRequest {
  const normalized = sourceUrl.trim();
  if (previous?.sourceUrl === normalized && previous.status === 'failed') return { ...previous, generation: previous.generation + 1, status: 'pending' };
  return { sourceUrl: normalized, operationId: `${profile}-${createOperationId()}`, generation: (previous?.generation || 0) + 1, status: 'pending' };
}

export function acceptsUrlAttachmentResult(current: UrlAttachmentRequest | null, request: UrlAttachmentRequest, visibleUrl: string): boolean {
  return current?.generation === request.generation && current.sourceUrl === request.sourceUrl && visibleUrl.trim() === request.sourceUrl;
}
