import jwt from 'jsonwebtoken';
import DesktopSession from '../models/DesktopSession.js';

export const desktopJwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production');
  return 'local-development-secret';
};

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in is required.' } });
  try {
    req.user = jwt.verify(token, desktopJwtSecret());
    return next();
  } catch {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Session is invalid or expired.' } });
  }
}

export function readBearer(req) {
  return req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
}

export async function requireDesktopSession(req, res, next) {
  const token = readBearer(req);
  if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Desktop session is required.' } });
  try {
    req.desktop = await authenticateDesktopToken(token);
    return next();
  } catch {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Desktop session is invalid or expired.' } });
  }
}

export async function authenticateDesktopToken(token) {
  const payload = jwt.verify(token, desktopJwtSecret(), { algorithms: ['HS256'] });
  if (payload.type !== 'desktop' || !payload.jti) throw new Error('Invalid desktop session');
  const session = await DesktopSession.findOne({ tokenId: payload.jti, revokedAt: null, expiresAt: { $gt: new Date() } }).lean();
  if (!session) throw new Error('Expired desktop session');
  return { tokenId: session.tokenId, profile: session.profile || null, payload };
}

export function requireProfile(req, res, next) {
  if (!req.desktop?.profile) return res.status(403).json({ success: false, error: { code: 'PROFILE_REQUIRED', message: 'Choose a profile first.' } });
  return next();
}

export async function optionalDesktopSession(req, _res, next) {
  const token = readBearer(req);
  if (token) { try { req.desktop = await authenticateDesktopToken(token); } catch { /* Legacy public routes remain compatible; protected features still reject invalid tokens. */ } }
  return next();
}
