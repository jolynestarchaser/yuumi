import assert from 'node:assert/strict';
import test from 'node:test';
import { collectLimited, importRemoteMedia, isPublicAddress, MAX_REMOTE_URL_CHARS, RemoteMediaError, resolvePublicHost, sniffMedia, validateRemoteUrl } from '../src/services/remoteMedia.js';

test('remote media URLs require credential-free HTTPS and exclude GIPHY', () => {
  assert.equal(validateRemoteUrl('https://cdn.example.test/photo.jpg').protocol, 'https:');
  for (const value of ['http://example.test/a.jpg', 'https://user:pass@example.test/a.jpg', 'https://example.test:444/a.jpg', 'file:///etc/passwd', 'blob:https://example.test/id', 'C:\\photo.jpg', 'https://giphy.com/gifs/cat-id', `https://example.test/${'a'.repeat(MAX_REMOTE_URL_CHARS)}`]) {
    assert.throws(() => validateRemoteUrl(value), RemoteMediaError);
  }
});

test('private, loopback, link-local, documentation and mapped addresses are rejected', () => {
  for (const value of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.1.1', '100.64.0.1', '192.0.2.1', '198.51.100.1', '203.0.113.1', '::1', 'fc00::1', 'fe80::1', 'fec0::1', '2001:db8::1', '2001:0db8::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '0:0:0:0:0:ffff:7f00:1', '0:0:0:0:0:0:a9fe:101', '64:ff9b::7f00:1', '2002:7f00:1::']) assert.equal(isPublicAddress(value), false, value);
  assert.equal(isPublicAddress('93.184.216.34'), true);
  assert.equal(isPublicAddress('2606:2800:220:1:248:1893:25c8:1946'), true);
});

test('DNS resolution rejects a mixed public/private answer set', async () => {
  const lookup = async () => [
    { address: '93.184.216.34', family: 4 as const },
    { address: '127.0.0.1', family: 4 as const },
  ];
  await assert.rejects(resolvePublicHost('mixed.example.test', lookup), /private.*reserved/i);
});

test('stream byte limit is independent of Content-Length', async () => {
  async function* chunks() { yield Buffer.alloc(6); yield Buffer.alloc(6); }
  await assert.rejects(collectLimited(chunks(), 10), /larger than/);
});

test('signature validation rejects HTML, SVG, fake MIME and expensive animation', () => {
  assert.throws(() => sniffMedia(Buffer.from('<html><script>alert(1)</script></html>')), /not supported/);
  assert.throws(() => sniffMedia(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), /not supported/);
  assert.throws(() => sniffMedia(Buffer.from('not really a png')), /signature/);
  const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.from([1, 0, 1, 0, 0, 0, 0]), ...Array.from({ length: 201 }, () => Buffer.from([0x2c]))]);
  assert.throws(() => sniffMedia(gif), /animation/);
});

test('small PNG signatures are accepted from actual bytes', () => {
  const png = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  Buffer.from('IHDR').copy(png, 12);
  png.writeUInt32BE(1, 16); png.writeUInt32BE(1, 20);
  assert.deepEqual(sniffMedia(png), { kind: 'image', mimeType: 'image/png' });
});

test('structural validation rejects compressed wrappers and documents header-only limits', () => {
  assert.throws(() => sniffMedia(Buffer.from([0x1f, 0x8b, 0x08, 0x00])), /signature/);
  const truncatedGif = Buffer.concat([Buffer.from('GIF89a'), Buffer.from([1, 0, 1, 0, 0, 0, 0]), Buffer.alloc(3)]);
  assert.deepEqual(sniffMedia(truncatedGif), { kind: 'image', mimeType: 'image/gif' });
});

test('structural parsers reject malformed image headers without claiming full codec decoding', () => {
  const pngWithoutIhdr = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(16)]);
  assert.throws(() => sniffMedia(pngWithoutIhdr), /PNG.*decodable/i);
  const badWebp = Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8X', 'binary');
  assert.throws(() => sniffMedia(badWebp), /WebP.*decodable/i);
  const jpegWithoutSof = Buffer.alloc(12); jpegWithoutSof[0] = 0xff; jpegWithoutSof[1] = 0xd8; jpegWithoutSof[2] = 0xff; jpegWithoutSof[3] = 0xd9;
  assert.throws(() => sniffMedia(jpegWithoutSof), /JPEG.*decodable/i);
});

test('audio acceptance is signature-only until a dedicated bounded decoder is approved', () => {
  assert.deepEqual(sniffMedia(Buffer.from('RIFF\x00\x00\x00\x00WAVE', 'binary')), { kind: 'audio', mimeType: 'audio/wav' });
  assert.deepEqual(sniffMedia(Buffer.from('OggS', 'binary')), { kind: 'audio', mimeType: 'audio/ogg' });
  assert.deepEqual(sniffMedia(Buffer.from('ID3', 'binary')), { kind: 'audio', mimeType: 'audio/mpeg' });
  assert.deepEqual(sniffMedia(Buffer.from('\x00\x00\x00\x18ftypisom', 'binary')), { kind: 'audio', mimeType: 'audio/mp4' });
});

test('mocked redirects are revalidated and never contact a private hop', async () => {
  let downloads = 0;
  const resolve = async () => [{ address: '93.184.216.34', family: 4 as const }];
  const download = async () => { downloads += 1; return { status: 302, location: 'https://127.0.0.1/private', buffer: Buffer.alloc(0) }; };
  await assert.rejects(importRemoteMedia('https://example.test/file.png', undefined, { resolve, download }), /private.*reserved/i);
  assert.equal(downloads, 1);
});

test('mocked redirect loops and provider redirects are rejected without live network calls', async () => {
  const resolve = async () => [{ address: '93.184.216.34', family: 4 as const }];
  const loop = async (url: URL) => ({ status: 302, location: url.toString(), buffer: Buffer.alloc(0) });
  await assert.rejects(importRemoteMedia('https://example.test/file.png', undefined, { resolve, download: loop }), /redirected too many/);
  const toGiphy = async () => ({ status: 302, location: 'https://media.giphy.com/media/id/giphy.gif', buffer: Buffer.alloc(0) });
  await assert.rejects(importRemoteMedia('https://example.test/file.png', undefined, { resolve, download: toGiphy }), /GIPHY picker/);
  const malformed = async () => ({ status: 302, location: 'https://[invalid', buffer: Buffer.alloc(0) });
  await assert.rejects(
    importRemoteMedia('https://example.test/file.png', undefined, { resolve, download: malformed }),
    (error: unknown) => error instanceof RemoteMediaError && error.code === 'REDIRECT',
  );
});

test('the overall deadline includes DNS and cancellation interrupts pending resolution', async () => {
  const neverResolve = () => new Promise<Array<{ address: string; family: 4 | 6 }>>(() => undefined);
  await assert.rejects(
    importRemoteMedia('https://example.test/file.png', undefined, { resolve: neverResolve, overallTimeoutMs: 10 }),
    (error: unknown) => error instanceof RemoteMediaError && error.code === 'TIMEOUT',
  );
  const controller = new AbortController();
  const importPromise = importRemoteMedia('https://example.test/file.png', controller.signal, { resolve: neverResolve, overallTimeoutMs: 1_000 });
  controller.abort();
  await assert.rejects(importPromise, (error: unknown) => error instanceof RemoteMediaError && error.code === 'CANCELED');
});

test('malformed percent encoding cannot turn a valid import into a server error', async () => {
  const png = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  Buffer.from('IHDR').copy(png, 12);
  png.writeUInt32BE(1, 16); png.writeUInt32BE(1, 20);
  const result = await importRemoteMedia('https://example.test/%E0%A4%A.png', undefined, {
    resolve: async () => [{ address: '93.184.216.34', family: 4 as const }],
    download: async () => ({ status: 200, buffer: png }),
  });
  assert.equal(result.name, '%E0%A4%A.png');
});
