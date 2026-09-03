import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const publicUser = (user) => ({ id: user.id, username: user.username, displayName: user.displayName });

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username: username?.toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Username or password is incorrect.' } });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, data: { token, user: publicUser(user) } });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User no longer exists.' } });
  res.json({ success: true, data: publicUser(user) });
});
export default router;

