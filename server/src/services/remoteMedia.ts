import { lookup as dnsLookup } from 'node:dns/promises';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';

export const MAX_REMOTE_MEDIA_BYTES = 10 * 1024 * 1024;
export const MAX_REMOTE_URL_CHARS = 8_192;
const MAX_REDIRECTS = 4;
const OVERALL_TIMEOUT_MS = 15_000;
const GIPHY_HOSTS = new Set(['giphy.com', 'www.giphy.com', 'media.giphy.com']);

export class RemoteMediaError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

const fail = (code: string, message: string): never => { throw new RemoteMediaError(code, message); };

function ipv6Words(address: string): number[] | null {
  let value = address.toLowerCase().split('%')[0];
  if (value.includes('.')) {
    const separator = value.lastIndexOf(':');
    const octets = value.slice(separator + 1).split('.').map(Number);
    if (separator < 0 || octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null;
    value = `${value.slice(0, separator)}:${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  }
  const halves = value.split('::');
  if (halves.length > 2) return null;
  const parseHalf = (half: string) => half ? half.split(':').map((part) => Number.parseInt(part, 16)) : [];
  const left = parseHalf(halves[0]);
  const right = parseHalf(halves[1] || '');
  if ([...left, ...right].some((word) => !Number.isInteger(word) || word < 0 || word > 0xffff)) return null;
  if (halves.length === 1) return left.length === 8 ? left : null;
  const missing = 8 - left.length - right.length;
  return missing > 0 ? [...left, ...Array(missing).fill(0), ...right] : null;
}

function embeddedIpv4(address: string): string | null {
  const words = ipv6Words(address);
  if (!words) return null;
  let high: number | undefined;
  let low: number | undefined;
  if (words.slice(0, 6).every((word) => word === 0) || (words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff)) {
    [high, low] = words.slice(6);
  } else if (words[0] === 0x64 && words[1] === 0xff9b && words.slice(2, 6).every((word) => word === 0)) {
    [high, low] = words.slice(6);
  } else if (words[0] === 0x2002) {
    [high, low] = words.slice(1, 3);
  }
  return high === undefined || low === undefined
    ? null
    : `${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`;
}

export function isPublicAddress(address: string): boolean {
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
    const embedded = embeddedIpv4(address);
    if (embedded && !isPublicAddress(embedded)) return false;
    const words = ipv6Words(address);
    if (!words) return false;
    const [first, second, third] = words;
    return !(words.slice(0, 6).every((word) => word === 0) || (words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff)
      || (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xffc0) === 0xfec0
      || (first & 0xff00) === 0xff00 || (first === 0x2001 && second === 0xdb8)
      || (first === 0x2001 && second === 0) || (first === 0x2001 && (second & 0xfff0) === 0x10)
      || (first === 0x2001 && (second & 0xfff0) === 0x20) || first === 0x3fff || first === 0x100
      || (first === 0x64 && second === 0xff9b && third === 1));
  }
  return false;
}

export function validateRemoteUrl(input: string): URL {
  if (input.length > MAX_REMOTE_URL_CHARS) fail('INVALID_URL', 'The media URL is too long.');
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

type DnsResolver = (hostname: string, options: { all: true; verbatim: true }) => Promise<Array<{ address: string; family: 4 | 6 }>>;

export async function resolvePublicHost(hostname: string, lookup: DnsResolver = dnsLookup as DnsResolver) {
  const literal = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(literal)) {
    if (!isPublicAddress(literal)) fail('PRIVATE_ADDRESS', 'Private and reserved network addresses are not allowed.');
    return [{ address: literal, family: net.isIP(literal) as 4 | 6 }];
  }
  const results = await lookup(hostname, { all: true, verbatim: true });
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
  overallTimeoutMs?: number;
};

function abortError(signal: AbortSignal) {
  return signal.reason instanceof Error ? signal.reason : new RemoteMediaError('CANCELED', 'The media import was canceled.');
}

function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError(signal));
  return new Promise((resolve, reject) => {
    const onAbort = () => { cleanup(); reject(abortError(signal)); };
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    signal.addEventListener('abort', onAbort, { once: true });
    work.then((value) => { cleanup(); resolve(value); }, (error) => { cleanup(); reject(error); });
  });
}

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
    const abort = () => request.destroy(signal ? abortError(signal) : new RemoteMediaError('CANCELED', 'The media import was canceled.'));
    signal?.addEventListener('abort', abort, { once: true });
    request.end();
  });
}

export async function importRemoteMedia(input: string, signal?: AbortSignal, dependencies: RemoteMediaDependencies = {}) {
  const resolve = dependencies.resolve || resolvePublicHost;
  const download = dependencies.download || downloadPinned;
  let url = validateRemoteUrl(input);
  const operation = new AbortController();
  const cancel = () => operation.abort(new RemoteMediaError('CANCELED', 'The media import was canceled.'));
  if (signal?.aborted) cancel();
  else signal?.addEventListener('abort', cancel, { once: true });
  const deadline = setTimeout(
    () => operation.abort(new RemoteMediaError('TIMEOUT', 'The remote media import timed out.')),
    dependencies.overallTimeoutMs ?? OVERALL_TIMEOUT_MS,
  );
  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const addresses = await abortable(Promise.resolve().then(() => resolve(url.hostname)), operation.signal);
      const selected = addresses[0];
      const response = await abortable(download(url, selected.address, selected.family, operation.signal), operation.signal);
      if (response.status >= 300 && response.status < 400) {
        if (!response.location || redirects === MAX_REDIRECTS) fail('REDIRECT', 'The remote URL redirected too many times.');
        let redirected: URL;
        try { redirected = new URL(response.location, url); } catch { return fail('REDIRECT', 'The remote server returned an invalid redirect.'); }
        url = validateRemoteUrl(redirected.toString());
        continue;
      }
      const media = sniffMedia(response.buffer);
      let decodedPath = url.pathname;
      try { decodedPath = decodeURIComponent(decodedPath); } catch { /* Keep the encoded path as a display-name fallback. */ }
      const filename = path.posix.basename(decodedPath) || `attachment.${media.mimeType.split('/')[1]}`;
      return { ...media, buffer: response.buffer, bytes: response.buffer.length, name: filename.slice(0, 180) };
    }
    return fail('REDIRECT', 'The remote URL redirected too many times.');
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener('abort', cancel);
  }
}
