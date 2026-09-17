const SPOTIFY_TYPES = new Set(['track', 'album', 'playlist', 'episode', 'show', 'artist']);

export interface SpotifyAttachment {
  kind: 'spotify'; spotifyUrl: string; embedUrl: string; name: string;
}

// Only a canonical Spotify URL becomes an iframe source. This prevents an
// arbitrary pasted URL from being embedded in the shared desktop.
export function normalizeSpotifyAttachment(value: unknown): SpotifyAttachment | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as { kind?: unknown; spotifyUrl?: unknown };
  if (candidate.kind !== 'spotify' || typeof candidate.spotifyUrl !== 'string') return undefined;
  try {
    const url = new URL(candidate.spotifyUrl.trim());
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'open.spotify.com') return undefined;
    const [kind, id] = url.pathname.split('/').filter(Boolean);
    if (!SPOTIFY_TYPES.has(kind) || !/^[A-Za-z0-9]{22}$/.test(id || '')) return undefined;
    const spotifyUrl = `https://open.spotify.com/${kind}/${id}`;
    return { kind: 'spotify', spotifyUrl, embedUrl: `https://open.spotify.com/embed/${kind}/${id}`, name: `Spotify ${kind}` };
  } catch {
    return undefined;
  }
}
