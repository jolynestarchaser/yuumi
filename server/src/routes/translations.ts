import { Router } from 'express';
import { requireDesktopSession, requireProfile } from '../middleware/auth.js';
import { isTranslationRequest, translateText } from '../services/translation.js';

const router = Router();
const requestWindow = new Map<string, number[]>();
router.use(requireDesktopSession, requireProfile);

function withinRateLimit(profile: string) {
  const now = Date.now();
  const current = (requestWindow.get(profile) || []).filter((time) => now - time < 60_000);
  if (current.length >= 20) return false;
  current.push(now);
  requestWindow.set(profile, current);
  return true;
}

router.post('/', async (req, res, next) => {
  const { text, target } = req.body || {};
  if (!isTranslationRequest(text, target)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter up to 5,000 characters and choose English or Thai.' } });
  if (!withinRateLimit(req.desktop.profile)) return res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Please wait before translating again.' } });
  try {
    const result = await translateText(text.trim(), target);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
