import { Router } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dns from 'node:dns/promises';
import net from 'node:net';

const router = Router();
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

router.post('/', async (req, res) => {
  const url = await safeUrl(req.body.url);
  const response = await axios.get(url.href, { timeout: 5000, maxContentLength: 1_000_000, responseType: 'text', maxRedirects: 0, headers: { 'User-Agent': 'CuteDesktopPreview/1.0' } });
  const $ = cheerio.load(response.data);
  const title = content($, 'meta[property="og:title"]') || $('title').text().trim() || url.hostname;
  const description = content($, 'meta[property="og:description"]') || content($, 'meta[name="description"]');
  const previewImage = content($, 'meta[property="og:image"]');
  const favicon = $('link[rel~="icon"]').attr('href') || `${url.origin}/favicon.ico`;
  res.json({ success: true, data: { title, description, previewImage, favicon, siteName: content($, 'meta[property="og:site_name"]') || url.hostname, url: url.href } });
});
export default router;

