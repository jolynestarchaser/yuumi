import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDb } from './config/db.js';
import itemRoutes from './routes/items.js';
import mediaRoutes from './routes/media.js';
import linkPreviewRoutes from './routes/linkPreview.js';
import desktopSettingsRoutes from './routes/desktopSettings.js';
import desktopWindowRoutes from './routes/desktopWindows.js';
import desktopStrokeRoutes from './routes/desktopStrokes.js';
import desktopTextRoutes from './routes/desktopTexts.js';
import spotifyRoutes from './routes/spotify.js';
import authRoutes from './routes/auth.js';
import historyRoutes from './routes/history.js';
import messageRoutes from './routes/messages.js';
import companionRoutes from './routes/companions.js';
import translationRoutes from './routes/translations.js';
import { setupRealtime } from './realtime.js';
import { authenticateDesktopToken } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean);
const origin = (requestOrigin, callback) => callback(null, !requestOrigin || allowedOrigins.includes(requestOrigin));
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin, methods: ['GET', 'POST'], credentials: false }, pingInterval: 25000, pingTimeout: 20000 });
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    socket.data.desktop = await authenticateDesktopToken(token);
    if (!socket.data.desktop.profile) return next(new Error('Choose a profile first'));
    return next();
  } catch { return next(new Error('Authentication required')); }
});
app.use(cors({ origin }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.set('io', io);
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/link-preview', linkPreviewRoutes);
app.use('/api/settings/desktop', desktopSettingsRoutes);
app.use('/api/desktop/windows', desktopWindowRoutes);
app.use('/api/desktop/strokes', desktopStrokeRoutes);
app.use('/api/desktop/texts', desktopTextRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/translations', translationRoutes);
app.use('/api/companions', companionRoutes);
app.use(notFound);
app.use(errorHandler);

setupRealtime(io);
connectDb().then(() => httpServer.listen(process.env.PORT || 5000, () => console.info(`API listening on ${process.env.PORT || 5000}`))).catch((error) => { console.error(error); process.exit(1); });
