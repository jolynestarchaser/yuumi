import { Router } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dns from 'node:dns/promises';
import net from 'node:net';
import type { LinkMetadata } from '../../../shared/contracts.js';

const router = Router();
let spotifyAppToken = null;
const privateV4 = /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
function isPrivateHost(host) { return host === 'localhost' || privateV4.test(host) || host === '::1' || host.startsWith('fc') || host.startsWith('fd'); }
async function safeUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || isPrivateHost(url.hostname)) throw new Error('That URL is not allowed.');
  if (net.isIP(url.hostname)) { if (isPrivateHost(url.hostname)) throw new Error('Private addresses are not allowed.'); return url; }
  const records = await dns.lookup(url.hostname, { all: true });
  if (records.some((record) => isPrivateHost(record.address))) throw new Error('Private addresses are not allowed.');
  return url;
}
const content = ($, selector, attribute = 'content') => $(selector).attr(attribute)?.trim() || '';
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function youtubeVideo(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  let id = '';
  if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
  if (host === 'youtube.com' || host === 'm.youtube.com') id = url.searchParams.get('v') || (url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] || '');
  if (!/^[\w-]{11}$/.test(id)) return null;
  return { title: 'YouTube video', description: 'Watch on YouTube', previewImage: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, favicon: 'https://www.youtube.com/favicon.ico', siteName: 'YouTube', provider: 'youtube', videoId: id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
}

async function spotifyCatalogPreview(mediaType: string, providerId: string): Promise<Partial<LinkMetadata>> {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) return {};
  try {
    if (!spotifyAppToken || Date.now() >= spotifyAppToken.expiresAt - 60_000) {
      const token = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: { username: process.env.SPOTIFY_CLIENT_ID, password: process.env.SPOTIFY_CLIENT_SECRET },
        timeout: 5_000
      });
      spotifyAppToken = { value: token.data.access_token, expiresAt: Date.now() + token.data.expires_in * 1000 };
    }
    const collection = { track: 'tracks', album: 'albums', playlist: 'playlists', episode: 'episodes', show: 'shows', artist: 'artists' }[mediaType];
    const response = await axios.get(`https://api.spotify.com/v1/${collection}/${providerId}`, { headers: { Authorization: `Bearer ${spotifyAppToken.value}` }, timeout: 5_000 });
    const data = response.data;
    const artists = data.artists?.length ? data.artists : data.show?.publisher ? [{ name: data.show.publisher }] : [];
    return { title: data.name, description: artists.map((artist) => artist.name).filter(Boolean).join(', '), previewImage: (data.album?.images || data.images || data.show?.images || [])[0]?.url };
  } catch {
    return {};
  }
}

async function spotifyEmbed(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (host !== 'open.spotify.com') return null;
  const [mediaType, providerId] = url.pathname.split('/').filter(Boolean);
  if (!['track', 'album', 'playlist', 'episode', 'show', 'artist'].includes(mediaType) || !/^[A-Za-z0-9]{22}$/.test(providerId || '')) return null;
  const label = mediaType === 'track' ? 'Track' : `${mediaType[0].toUpperCase()}${mediaType.slice(1)}`;
  let preview: Partial<LinkMetadata> = {};
  try {
    const response = await axios.get('https://open.spotify.com/oembed', { params: { url: url.href }, timeout: 5_000, maxContentLength: 200_000 });
    preview = { title: response.data.title, previewImage: response.data.thumbnail_url };
  } catch {
    // The playable embed remains available even if Spotify's optional oEmbed preview is unavailable.
  }
  const catalog = await spotifyCatalogPreview(mediaType, providerId);
  return {
    title: catalog.title || preview.title || `Spotify ${label}`,
    description: catalog.description || `Play this ${mediaType} in Spotify.`,
    favicon: 'https://open.spotify.com/favicon.ico',
    siteName: 'Spotify',
    provider: 'spotify',
    previewImage: catalog.previewImage || preview.previewImage || '', providerId,
    mediaType,
    embedUrl: `https://open.spotify.com/embed/${mediaType}/${providerId}?utm_source=generator`
  };
}

router.post('/', asyncRoute(async (req, res) => {
  const url = await safeUrl(req.body.url);
  const youtube = youtubeVideo(url);
  if (youtube) return res.json({ success: true, data: { ...youtube, url: url.href } });
  const spotify = await spotifyEmbed(url);
  if (spotify) return res.json({ success: true, data: { ...spotify, url: url.href } });
  const response = await axios.get(url.href, { timeout: 5000, maxContentLength: 1_000_000, responseType: 'text', maxRedirects: 0, headers: { 'User-Agent': 'CuteDesktopPreview/1.0' } });
  const $ = cheerio.load(response.data);
  const title = content($, 'meta[property="og:title"]') || $('title').text().trim() || url.hostname;
  const description = content($, 'meta[property="og:description"]') || content($, 'meta[name="description"]');
  const previewImage = content($, 'meta[property="og:image"]');
  const favicon = $('link[rel~="icon"]').attr('href') || `${url.origin}/favicon.ico`;
  res.json({ success: true, data: { title, description, previewImage, favicon, siteName: content($, 'meta[property="og:site_name"]') || url.hostname, url: url.href } });
}));
export default router;
