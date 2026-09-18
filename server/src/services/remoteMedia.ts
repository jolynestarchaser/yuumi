import { lookup as dnsLookup } from 'node:dns/promises';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';

export const MAX_REMOTE_MEDIA_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const GIPHY_HOSTS = new Set(['giphy.com', 'www.giphy.com', 'media.giphy.com']);

export class RemoteMediaError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

const fail = (code: string, message: string): never => { throw new RemoteMediaError(code, message); };

export function isPublicAddress(address: string): boolean {
  const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return isPublicAddress(mapped);
  const version = net.isIP(address);
  if (version === 4) {
    const octets = address.split('.').map(Number);
    const [a, b] = octets;
    if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || (a === 192 && b === 0) || (a === 192 && b === 0 && octets[2] === 2)
      || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0));
  }
  if (version === 6) {
    const value = address.toLowerCase();
    const first = Number.parseInt(value.split(':')[0] || '0', 16);
    return !(value.startsWith('::') || (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xffc0) === 0xfec0
      || (first & 0xff00) === 0xff00 || value.startsWith('2001:db8:') || value.startsWith('2001:10:')
      || value.startsWith('2001:20:') || value.startsWith('3fff:') || value.startsWith('100:') || value.startsWith('64:ff9b:1:'));
  }
  return false;
}

export function validateRemoteUrl(input: string): URL {
  let url: URL;
  try { url = new URL(input); } catch { return fail('INVALID_URL', 'Enter a valid HTTPS media URL.'); }
  if (url.protocol !== 'https:') fail('INVALID_URL', 'Only HTTPS media URLs are supported.');
  if (url.username || url.password) fail('INVALID_URL', 'URLs containing credentials are not supported.');
  if (url.port && url.port !== '443') fail('INVALID_URL', 'Only the standard HTTPS port is supported.');
  if (GIPHY_HOSTS.has(url.hostname.toLowerCase())) fail('PROVIDER_URL', 'Use the GIPHY picker for GIPHY media.');
  const literal = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(literal) && !isPublicAddress(literal)) fail('PRIVATE_ADDRESS', 'Private and reserved network addresses are not allowed.');
  return url;
}

export async function resolvePublicHost(hostname: string) {
  const literal = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(literal)) {
    if (!isPublicAddress(literal)) fail('PRIVATE_ADDRESS', 'Private and reserved network addresses are not allowed.');
    return [{ address: literal, family: net.isIP(literal) as 4 | 6 }];
  }
  const results = await dnsLookup(hostname, { all: true, verbatim: true });
  if (!results.length || results.some((result) => !isPublicAddress(result.address))) fail('PRIVATE_ADDRESS', 'The host resolved to a private or reserved network address.');
  return results;
}

export async function collectLimited(source: AsyncIterable<Uint8Array>, limit = MAX_REMOTE_MEDIA_BYTES): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of source) {
    total += chunk.byteLength;
    if (total > limit) fail('TOO_LARGE', 'The remote media file is larger than 10 MB.');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, total);
}

function imageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number; frames: number } {
  if (mimeType === 'image/png') {
    if (buffer.length < 24 || buffer.subarray(12, 16).toString('ascii') !== 'IHDR') return fail('INVALID_MEDIA', 'The PNG file is not decodable.');
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), frames: 1 };
  }
  if (mimeType === 'image/gif') {
    let frames = 0;
    for (let index = 13; index < buffer.length; index += 1) if (buffer[index] === 0x2c) frames += 1;
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8), frames: Math.max(1, frames) };
  }
  if (mimeType === 'image/webp') {
    const chunk = buffer.subarray(12, 16).toString('ascii');
    if (chunk === 'VP8X' && buffer.length >= 30) {
      const width = 1 + buffer.readUIntLE(24, 3), height = 1 + buffer.readUIntLE(27, 3);
      let frames = 0;
      for (let index = 12; index + 4 <= buffer.length; index += 1) if (buffer.subarray(index, index + 4).toString('ascii') === 'ANMF') frames += 1;
      return { width, height, frames: Math.max(1, frames) };
    }
    if (chunk === 'VP8 ' && buffer.length >= 30 && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff, frames: 1 };
    if (chunk === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, frames: 1 };
    }
    return fail('INVALID_MEDIA', 'The WebP file is not decodable.');
  }
  for (let offset = 2; offset + 9 < buffer.length;) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1], length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), frames: 1 };
    if (length < 2) break;
    offset += 2 + length;
  }
  return fail('INVALID_MEDIA', 'The JPEG file is not decodable.');
}

export function sniffMedia(buffer: Buffer): { kind: 'image' | 'audio'; mimeType: string } {
  if (!buffer.length) fail('INVALID_MEDIA', 'The remote file is empty.');
  const prefix = buffer.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
  if (prefix.startsWith('<!doctype') || prefix.startsWith('<html') || prefix.startsWith('<svg') || prefix.startsWith('<?xml') || prefix.includes('<script')) fail('INVALID_MEDIA', 'HTML, SVG, and script content are not supported.');
  let mimeType = '';
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) mimeType = 'image/png';
  else if (buffer.length >= 16 && (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a')) mimeType = 'image/gif';
  else if (buffer.length >= 16 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') mimeType = 'image/webp';
  else if (buffer.length >= 12 && buffer[0] === 0xff && buffer[1] === 0xd8) mimeType = 'image/jpeg';
  else if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE') mimeType = 'audio/wav';
  else if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'OggS') mimeType = 'audio/ogg';
  else if (buffer.length >= 3 && (buffer.subarray(0, 3).toString('ascii') === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0))) mimeType = 'audio/mpeg';
  else if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') mimeType = 'audio/mp4';
  else fail('INVALID_MEDIA', 'The remote file signature is not supported.');
  if (mimeType.startsWith('image/')) {
    const { width, height, frames } = imageDimensions(buffer, mimeType);
    if (!width || !height || width * height > 40_000_000 || frames > 200 || width * height * frames > 80_000_000) fail('RESOURCE_LIMIT', 'The image dimensions or animation are too large.');
  }
  return { kind: mimeType.startsWith('image/') ? 'image' : 'audio', mimeType };
}

export type RemoteDownload = { status: number; location?: string; buffer: Buffer };
type RemoteMediaDependencies = {
  resolve?: typeof resolvePublicHost;
  download?: (url: URL, address: string, family: number, signal?: AbortSignal) => Promise<RemoteDownload>;
};

async function downloadPinned(url: URL, address: string, family: number, signal?: AbortSignal): Promise<RemoteDownload> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let connect: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: Error, value?: { status: number; location?: string; buffer: Buffer }) => { if (settled) return; settled = true; clearTimeout(overall); if (connect) clearTimeout(connect); signal?.removeEventListener('abort', abort); error ? reject(error) : resolve(value!); };
    const requestHost = url.hostname.replace(/^\[|\]$/g, '');
    const request = https.request({ protocol: 'https:', hostname: requestHost, port: 443, path: `${url.pathname}${url.search}`, method: 'GET', ...(net.isIP(requestHost) ? {} : { servername: requestHost }), headers: { Accept: 'image/jpeg,image/png,image/webp,image/gif,audio/*', 'User-Agent': 'YuuMi-Media-Importer/1.0' }, lookup: (_host, _options, callback) => callback(null, address, family as 4 | 6) }, async (response) => {
      try {
        const status = response.statusCode || 0;
        if (status >= 300 && status < 400) { response.resume(); return finish(undefined, { status, location: response.headers.location, buffer: Buffer.alloc(0) }); }
        if (status !== 200) { response.resume(); return finish(new RemoteMediaError('REMOTE_STATUS', 'The remote server did not return a media file.')); }
        const declared = Number(response.headers['content-length']);
        if (Number.isFinite(declared) && declared > MAX_REMOTE_MEDIA_BYTES) { response.destroy(); return finish(new RemoteMediaError('TOO_LARGE', 'The remote media file is larger than 10 MB.')); }
        response.setTimeout(8_000, () => response.destroy(new RemoteMediaError('TIMEOUT', 'The remote media response timed out.')));
        const buffer = await collectLimited(response);
        finish(undefined, { status, buffer });
      } catch (error) { finish(error as Error); }
    });
    const overall = setTimeout(() => request.destroy(new RemoteMediaError('TIMEOUT', 'The remote media import timed out.')), 15_000);
    connect = setTimeout(() => request.destroy(new RemoteMediaError('TIMEOUT', 'The remote host took too long to connect.')), 5_000);
    request.on('socket', (socket) => socket.once('secureConnect', () => clearTimeout(connect)));
    request.on('error', (error) => finish(error));
    const abort = () => request.destroy(new RemoteMediaError('CANCELED', 'The media import was canceled.'));
    signal?.addEventListener('abort', abort, { once: true });
    request.end();
  });
}

export async function importRemoteMedia(input: string, signal?: AbortSignal, dependencies: RemoteMediaDependencies = {}) {
  const resolve = dependencies.resolve || resolvePublicHost;
  const download = dependencies.download || downloadPinned;
  let url = validateRemoteUrl(input);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const addresses = await resolve(url.hostname);
    const selected = addresses[0];
    const response = await download(url, selected.address, selected.family, signal);
    if (response.status >= 300 && response.status < 400) {
      if (!response.location || redirects === MAX_REDIRECTS) fail('REDIRECT', 'The remote URL redirected too many times.');
      url = validateRemoteUrl(new URL(response.location, url).toString());
      continue;
    }
    const media = sniffMedia(response.buffer);
    const filename = path.basename(decodeURIComponent(url.pathname)) || `attachment.${media.mimeType.split('/')[1]}`;
    return { ...media, buffer: response.buffer, bytes: response.buffer.length, name: filename.slice(0, 180) };
  }
  return fail('REDIRECT', 'The remote URL redirected too many times.');
}
