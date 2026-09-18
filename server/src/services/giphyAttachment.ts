type GiphyAttachmentInput = {
  kind: 'giphy';
  gifId?: unknown;
};

const GIPHY_HOSTS = new Set(['giphy.com', 'www.giphy.com', 'media.giphy.com']);
const GIPHY_ID = /^[A-Za-z0-9]{1,80}$/;

export function giphyIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !GIPHY_HOSTS.has(url.hostname.toLowerCase())) return null;
    const match = url.pathname.match(/(?:gifs\/[^/]*-|media\/)([A-Za-z0-9]+)(?:\/|$|\.gif)/i);
    return match?.[1] && GIPHY_ID.test(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}

export function normalizeGiphyAttachment(input: GiphyAttachmentInput) {
  if (input.kind !== 'giphy' || typeof input.gifId !== 'string' || !GIPHY_ID.test(input.gifId)) {
    throw new Error('Invalid GIPHY GIF');
  }

  return {
    kind: 'giphy' as const,
    provider: 'giphy' as const,
    gifId: input.gifId,
    name: 'GIPHY GIF',
  };
}
