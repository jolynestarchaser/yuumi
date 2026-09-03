import { randomUUID } from 'node:crypto';
import axios from 'axios';
import { Router } from 'express';

const router = Router();
let connection = null;

const scopes = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-modify-playback-state',
  'user-library-read',
  'playlist-read-private'
].join(' ');

function configured() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET && process.env.SPOTIFY_REDIRECT_URI);
}

function cookie(req, name) {
  return req.headers.cookie?.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

function clientOrigin() {
  return process.env.CLIENT_ORIGIN || 'http://localhost:5173';
}

async function exchange(params) {
  const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams(params).toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
    },
    timeout: 10_000
  });
  return response.data;
}

async function validToken() {
  if (!connection) return null;
  if (Date.now() < connection.expiresAt - 60_000) return connection.accessToken;
  const data = await exchange({ grant_type: 'refresh_token', refresh_token: connection.refreshToken });
  connection = { ...connection, accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000, refreshToken: data.refresh_token || connection.refreshToken };
  return connection.accessToken;
}

router.get('/status', (req, res) => res.json({ success: true, data: { configured: configured(), connected: Boolean(connection) } }));

router.get('/login', (req, res) => {
  if (!configured()) return res.status(503).json({ success: false, error: { code: 'SPOTIFY_NOT_CONFIGURED', message: 'Spotify credentials or redirect URI are missing on the server.' } });
  const state = randomUUID();
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `spotify_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/api/spotify; Max-Age=600${secure}`);
  const params = new URLSearchParams({ client_id: process.env.SPOTIFY_CLIENT_ID, response_type: 'code', redirect_uri: process.env.SPOTIFY_REDIRECT_URI, state, scope: scopes, show_dialog: 'true' });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

router.get('/callback', async (req, res, next) => {
  try {
    if (req.query.error) throw new Error('Spotify authorization was cancelled.');
    if (!req.query.code || req.query.state !== cookie(req, 'spotify_oauth_state')) throw new Error('Spotify authorization state did not match. Please try again.');
    const data = await exchange({ grant_type: 'authorization_code', code: req.query.code, redirect_uri: process.env.SPOTIFY_REDIRECT_URI });
    connection = { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + data.expires_in * 1000 };
    res.setHeader('Set-Cookie', 'spotify_oauth_state=; HttpOnly; SameSite=Lax; Path=/api/spotify; Max-Age=0');
    res.redirect(`${clientOrigin()}/?spotify=connected`);
  } catch (error) {
    next(error);
  }
});

router.get('/playback', async (req, res, next) => {
  try {
    const token = await validToken();
    if (!token) return res.status(401).json({ success: false, error: { code: 'SPOTIFY_NOT_CONNECTED', message: 'Connect Spotify first.' } });
    const response = await axios.get('https://api.spotify.com/v1/me/player', { headers: { Authorization: `Bearer ${token}` }, timeout: 10_000, validateStatus: (status) => status === 200 || status === 204 });
    res.json({ success: true, data: response.status === 204 ? null : response.data });
  } catch (error) {
    next(error);
  }
});

export default router;
