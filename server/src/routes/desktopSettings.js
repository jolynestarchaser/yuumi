import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import DesktopSettings from '../models/DesktopSettings.js';
import { optionalDesktopSession } from '../middleware/auth.js';

const router = Router();
router.use(optionalDesktopSession);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const presets = new Set(['neon', 'sunset', 'midnight']);
const themes = new Set(['soft', 'glass', 'classic']);
const wallpaperTypes = new Set(['preset', 'image', 'solid', 'gradient']);
const fits = new Set(['cover', 'contain', 'tile']);
const cursorStyles = new Set(['orb', 'ring', 'star']);
const cursorShapes = new Set(['dot', 'arrow', 'hand', 'crosshair', 'sparkle', 'image']);
const isColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const clamp = (value, min, max, fallback) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const shared = () => DesktopSettings.findOneAndUpdate({ key: 'shared-desktop' }, { $setOnInsert: { key: 'shared-desktop' } }, { new: true, upsert: true, setDefaultsOnInsert: true });
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

function uploadImage(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ resource_type: 'image', folder }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(file.buffer);
  });
}

router.get('/', async (_req, res) => res.json({ success: true, data: await shared() }));
router.patch('/', async (req, res) => {
  const settings = await shared();
  const { wallpaper, iconTheme, cursor, snapToGrid } = req.body;
  if (wallpaper !== undefined) {
    const current = settings.wallpaper?.toObject?.() || settings.wallpaper || {};
    const next = { ...current, ...wallpaper, position: { ...(current.position || {}), ...(wallpaper.position || {}) } };
    if (!wallpaperTypes.has(next.type)) throw new Error('Invalid wallpaper type');
    if (next.type === 'preset' && !presets.has(next.value)) throw new Error('Invalid wallpaper preset');
    if (next.type === 'image' && !next.asset?.url) throw new Error('An image wallpaper requires an uploaded asset');
    const colors = Array.isArray(next.colors) ? next.colors.filter(isColor).slice(0, 3) : [];
    if (next.type === 'solid' && colors.length < 1) throw new Error('A solid wallpaper requires a color');
    if (next.type === 'gradient' && colors.length < 2) throw new Error('A gradient wallpaper requires at least two colors');
    settings.wallpaper = {
      type: next.type,
      value: next.type === 'preset' ? next.value : 'custom',
      asset: next.type === 'image' ? next.asset : undefined,
      colors,
      angle: clamp(next.angle, 0, 360, 135),
      fit: fits.has(next.fit) ? next.fit : 'cover',
      position: { x: clamp(next.position?.x, 0, 100, 50), y: clamp(next.position?.y, 0, 100, 50) },
      backgroundColor: isColor(next.backgroundColor) ? next.backgroundColor : '#06113e',
      dimness: clamp(next.dimness, 0, 70, 18),
      blur: clamp(next.blur, 0, 24, 0),
      brightness: clamp(next.brightness, 40, 140, 100),
      saturation: clamp(next.saturation, 0, 180, 100)
    };
  }
  if (iconTheme !== undefined) { if (!themes.has(iconTheme)) throw new Error('Invalid icon theme'); settings.iconTheme = iconTheme; }
  if (cursor !== undefined) {
    if (typeof cursor !== 'object' || cursor === null || typeof cursor.enabled !== 'boolean' || !cursorStyles.has(cursor.style) || !cursorShapes.has(cursor.shape) || !isColor(cursor.color) || (cursor.shape === 'image' && !cursor.asset?.url)) throw new Error('Invalid cursor settings');
    settings.cursor = { enabled: cursor.enabled, style: cursor.style, shape: cursor.shape, asset: cursor.shape === 'image' ? cursor.asset : undefined, color: cursor.color };
  }
  if (snapToGrid !== undefined) { if (typeof snapToGrid !== 'boolean') throw new Error('snapToGrid must be boolean'); settings.snapToGrid = snapToGrid; }
  await settings.save();
  req.app.get('io')?.to('shared-desktop').emit('settings:updated', settings);
  res.json({ success: true, data: settings });
});
router.post('/assets/:kind', upload.single('file'), async (req, res) => {
  if (!['wallpaper', 'icon', 'cursor'].includes(req.params.kind)) throw new Error('Unknown asset kind');
  if (!req.file || !['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) throw new Error('Upload a JPEG, PNG, or WebP image under 10 MB');
  const result = await uploadImage(req.file, `yuuandmi/${req.params.kind}s`);
  res.status(201).json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
});
export default router;
