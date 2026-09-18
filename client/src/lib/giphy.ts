export function giphyIdFromUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (!['giphy.com', 'www.giphy.com', 'media.giphy.com'].includes(url.hostname.toLowerCase())) return undefined;
    const match = url.pathname.match(/(?:gifs\/[^/]*-|media\/)([A-Za-z0-9]+)(?:\/|$|\.gif)/);
    return match?.[1] && match[1].length <= 80 ? match[1] : undefined;
  } catch { return undefined; }
}

export const giphyImageUrl = (gifId: string) => `https://media.giphy.com/media/${encodeURIComponent(gifId)}/giphy.gif`;
