// Isolated local UI fixture. No .env, database, provider calls, or real accounts.
// Run from the repository root: npm run preview:companion --prefix server
import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { createServer as createViteServer } from '../../client/node_modules/vite/dist/node/index.js';
import Companion from '../src/models/Companion.js';
import { getCompanion, interactWithCompanion } from '../src/controllers/companionController.js';

delete process.env.GEMINI_API_KEY;
let state;
const copy = (value) => structuredClone(value);
const matches = (query) => state && (!query.lockToken || state.lockToken === query.lockToken) && (!query.lockedUntil || new Date(state.lockedUntil) <= query.lockedUntil.$lte);
const apply = (update) => { Object.assign(state, copy(update.$set || {})); for (const key of Object.keys(update.$unset || {})) delete state[key]; };
// The fixture implements only the model operations used by the controller.
Object.assign(Companion, {
findById: () => ({ lean: async () => copy(state) }),
updateOne: async (query, update) => {
  if (!state && update.$setOnInsert) state = { ...copy(update.$setOnInsert), lockedUntil: new Date(0), recentOperations: [] };
  else if (matches(query)) apply(update);
  return { acknowledged: true };
},
findOneAndUpdate: (query, update) => ({ lean: async () => {
  if (!matches(query)) return null;
  apply(update);
  return copy(state);
} })
});

const app = express();
const server = createServer(app);
const io = new Server(server);
const settings = { wallpaper: { type: 'preset', value: 'neon', colors: ['#b6ff00', '#2453ff'], angle: 135 }, cursor: { enabled: false }, iconTheme: 'soft' };
io.on('connection', (socket) => socket.on('desktop:join', () => socket.emit('desktop:snapshot', { items: [], windows: [], strokes: [], texts: [], settings })));
app.use(express.json());
const send = (res, data) => res.json({ success: true, data });
app.post('/api/auth/unlock', (_req, res) => send(res, { token: 'fixture-unlocked' }));
app.post('/api/auth/profile', (req, res) => send(res, { token: `fixture-${req.body.profile}`, profile: req.body.profile }));
app.get('/api/auth/session', (req, res) => send(res, { profile: req.headers.authorization?.includes('focus') ? 'focus' : req.headers.authorization?.includes('joe') ? 'joe' : '' }));
app.post('/api/auth/logout', (_req, res) => send(res, {}));
app.use('/api/companions', (req, _res, next) => { req.desktop = { tokenId: 'fixture', payload: {}, profile: req.headers.authorization?.includes('focus') ? 'focus' : 'joe' }; next(); });
app.get('/api/companions', getCompanion);
app.post('/api/companions/actions', interactWithCompanion);
app.get('/api/settings/desktop', (_req, res) => send(res, settings));
app.get('/api/spotify/status', (_req, res) => send(res, { configured: false, connected: false }));
app.get('/api/messages/unread-count', (_req, res) => send(res, { count: 0 }));
app.get('/api/*', (_req, res) => send(res, []));
const vite = await createViteServer({
  root: fileURLToPath(new URL('../../client', import.meta.url)),
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') },
  server: { middlewareMode: true, hmr: { server } }, appType: 'spa'
});
app.use(vite.middlewares);
server.listen(5179, '127.0.0.1', () => console.info('Isolated UI preview: http://127.0.0.1:5179 — any four-digit test PIN'));
