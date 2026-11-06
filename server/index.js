'use strict';

require('dotenv').config();

const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HANDLE = String(process.env.SUNO_PROFILE_HANDLE || 'sonorylab').trim().replace(/^@/, '');
const CACHE_TTL_MS = Math.max(60, Number(process.env.CACHE_TTL_SECONDS || 60)) * 1000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const MANUAL_FILE = path.join(DATA_DIR, 'manual-tracks.json');
const PROFILE_URL = `https://suno.com/@${encodeURIComponent(HANDLE)}`;
const PROFILE_API_URL = (page) => `https://studio-api.prod.suno.com/api/profiles/${encodeURIComponent(HANDLE)}?playlists_sort_by=created_at&clips_sort_by=created_at&page=${page}`;

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Content-Security-Policy': [
      "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'",
      "form-action 'self'", "script-src 'self'", "style-src 'self' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: https:",
      "media-src 'self' https:", "connect-src 'self'"
    ].join('; ')
  });
  if (req.path.startsWith('/admin') || req.path.startsWith('/api/admin')) {
    res.set({ 'Cache-Control': 'no-store', 'Pragma': 'no-cache', 'X-Robots-Tag': 'noindex, nofollow' });
  }
  next();
});
app.use(express.json({ limit: '48kb', strict: true }));
app.use(express.static(path.join(__dirname, '..', 'public'), {
  extensions: ['html'], etag: true, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
}));

let lastGoodTracks = [];
let lastSyncedAt = null;
let lastAttemptAt = 0;
let syncState = { status: 'pending', message: 'Aún no se ha consultado el catálogo público.' };
let syncingPromise = null;
const sessions = new Map();

async function ensureDataDir() { await fs.mkdir(DATA_DIR, { recursive: true }); }
async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') console.warn(`No se pudo leer ${path.basename(file)}:`, error.message);
    return fallback;
  }
}
async function writeJson(file, value) {
  await ensureDataDir();
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await fs.rename(temporary, file);
}
function toTagArray(value) {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12);
  if (typeof value === 'string') return value.split(/[,|]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
  return [];
}
function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
function normalizeClip(clip) {
  if (!clip || typeof clip !== 'object') return null;
  const id = String(clip.id || clip.clip_id || '').trim();
  if (!id) return null;
  const publicUrl = `https://suno.com/song/${encodeURIComponent(id)}`;
  const audioUrl = typeof clip.audio_url === 'string' && /^https:\/\//i.test(clip.audio_url) ? clip.audio_url : null;
  const imageUrl = typeof (clip.image_large_url || clip.image_url) === 'string' && /^https:\/\//i.test(clip.image_large_url || clip.image_url)
    ? (clip.image_large_url || clip.image_url) : null;
  return {
    id, title: String(clip.title || 'Untitled').trim().slice(0, 180), imageUrl, audioUrl, url: publicUrl,
    tags: toTagArray(clip.display_tags || clip.tags || clip.style), duration: toFiniteNumber(clip.duration),
    createdAt: clip.created_at || clip.createdAt || clip.created_at_timestamp || null,
    source: 'suno', pinned: Boolean(clip.is_pinned || clip.pinned),
  };
}
async function fetchProfilePage(page) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(PROFILE_API_URL(page), {
      method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; SonoryLabPublicCatalog/1.0)' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Suno respondió HTTP ${response.status}.`);
    const body = await response.json();
    if (!body || typeof body !== 'object' || !Array.isArray(body.clips)) throw new Error('La respuesta pública de Suno cambió de formato.');
    return body.clips;
  } finally { clearTimeout(timeout); }
}
async function fetchPublicCatalog() {
  const tracks = new Map();
  const maxPages = 8;
  for (let page = 1; page <= maxPages; page += 1) {
    const clips = await fetchProfilePage(page);
    for (const clip of clips) { const normalized = normalizeClip(clip); if (normalized) tracks.set(normalized.id, normalized); }
    if (clips.length === 0 || clips.length < 20) break;
  }
  return [...tracks.values()].sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0));
}
async function getManualTracks() {
  const tracks = await readJson(MANUAL_FILE, []);
  return Array.isArray(tracks) ? tracks : [];
}
async function mergeTracks(publicTracks) {
  const manualTracks = await getManualTracks();
  const merged = new Map(publicTracks.map((track) => [track.id, track]));
  for (const track of manualTracks) merged.set(track.id, track);
  return [...merged.values()].sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0));
}
async function syncCatalog(force = false) {
  if (syncingPromise) return syncingPromise;
  const now = Date.now();
  if (!force && lastSyncedAt && now - Date.parse(lastSyncedAt) < CACHE_TTL_MS) return { skipped: true, reason: 'cache-fresh' };
  if (force && now - lastAttemptAt < 15000) return { skipped: true, reason: 'cooldown' };
  lastAttemptAt = now;
  syncState = { status: 'syncing', message: 'Consultando las publicaciones públicas de Suno.' };
  syncingPromise = (async () => {
    try {
      const publicTracks = await fetchPublicCatalog();
      lastGoodTracks = publicTracks; lastSyncedAt = new Date().toISOString();
      await writeJson(CATALOG_FILE, { tracks: publicTracks, syncedAt: lastSyncedAt });
      syncState = { status: 'ok', message: `Catálogo público actualizado: ${publicTracks.length} canciones recibidas.` };
      return { ok: true, count: publicTracks.length };
    } catch (error) {
      syncState = { status: lastGoodTracks.length ? 'stale' : 'error', message: error.name === 'AbortError' ? 'La consulta a Suno agotó el tiempo de espera.' : error.message };
      return { ok: false, error: syncState.message };
    } finally { syncingPromise = null; }
  })();
  return syncingPromise;
}
async function getSnapshot() {
  if (!lastGoodTracks.length && !lastSyncedAt) {
    const cached = await readJson(CATALOG_FILE, null);
    if (cached && Array.isArray(cached.tracks)) {
      lastGoodTracks = cached.tracks; lastSyncedAt = cached.syncedAt || null;
      syncState = { status: 'stale', message: 'Mostrando el último catálogo guardado.' };
    }
  }
  return {
    tracks: await mergeTracks(lastGoodTracks),
    sync: { ...syncState, lastSyncedAt, profileUrl: PROFILE_URL, profileHandle: HANDLE, checkedAt: lastAttemptAt ? new Date(lastAttemptAt).toISOString() : null },
  };
}

const loginAttempts = new Map();
function limitLoginAttempts(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now(), windowMs = 15 * 60 * 1000;
  const entry = loginAttempts.get(key) || { count: 0, resetAt: now + windowMs };
  if (entry.resetAt <= now) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count += 1; loginAttempts.set(key, entry);
  if (loginAttempts.size > 5000) for (const [ip, value] of loginAttempts) if (value.resetAt <= now) loginAttempts.delete(ip);
  if (entry.count > 10) {
    res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Demasiados intentos. Vuelve a intentarlo más tarde.' });
  }
  next();
}
function requireSameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (!origin) return res.status(403).json({ error: 'Falta el origen de la solicitud.' });
  try {
    if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Origen no permitido.' });
  } catch { return res.status(403).json({ error: 'Origen no válido.' }); }
  if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: 'Solicitud cross-site bloqueada.' });
  next();
}
function safeEqual(a, b) {
  const left = Buffer.from(String(a)), right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function getSession(req) {
  const token = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('sonory_admin='))?.slice('sonory_admin='.length);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) { sessions.delete(token); return null; }
  return token;
}
function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'Configura ADMIN_PASSWORD en el entorno para habilitar el panel.' });
  if (!getSession(req)) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  next();
}
app.get('/api/catalog', async (req, res) => {
  await syncCatalog(false); res.set('Cache-Control', 'no-store'); res.json(await getSnapshot());
});
app.post('/api/sync', async (req, res) => {
  const result = await syncCatalog(true); res.set('Cache-Control', 'no-store');
  res.status(result.ok === false && result.skipped !== true ? 502 : 200).json({ ...result, ...(await getSnapshot()) });
});
app.get('/healthz', (req, res) => res.status(200).json({ ok: true, service: 'sonory-lab-web' }));
app.get('/api/admin/status', (req, res) => res.json({ configured: Boolean(ADMIN_PASSWORD), authenticated: Boolean(getSession(req)) }));
app.post('/api/admin/login', requireSameOrigin, limitLoginAttempts, (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'El panel está deshabilitado. Configura ADMIN_PASSWORD.' });
  const password = req.body?.password;
  if (typeof password !== 'string' || !safeEqual(password, ADMIN_PASSWORD)) return res.status(401).json({ error: 'Contraseña incorrecta.' });
  loginAttempts.delete(req.ip || req.socket.remoteAddress || 'unknown');
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
  res.setHeader('Set-Cookie', `sonory_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.json({ ok: true });
});
app.post('/api/admin/logout', requireSameOrigin, requireAdmin, (req, res) => {
  const token = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('sonory_admin='))?.slice('sonory_admin='.length);
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', 'sonory_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); res.json({ ok: true });
});
app.get('/api/admin/tracks', requireAdmin, async (req, res) => res.json({ tracks: await getManualTracks() }));
app.post('/api/admin/tracks', requireSameOrigin, requireAdmin, async (req, res) => {
  const { url, title, tags, imageUrl } = req.body || {};
  let parsed;
  try { parsed = new URL(String(url || '')); } catch { return res.status(400).json({ error: 'Introduce una URL válida de Suno.' }); }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'suno.com' || !parsed.pathname.startsWith('/song/')) return res.status(400).json({ error: 'Solo se aceptan enlaces públicos https://suno.com/song/…' });
  const id = parsed.pathname.split('/').filter(Boolean)[1];
  if (!id) return res.status(400).json({ error: 'No se pudo extraer el identificador de la canción.' });
  let cleanImage = null;
  if (typeof imageUrl === 'string' && imageUrl.trim()) {
    try { const candidate = new URL(imageUrl); if (candidate.protocol === 'https:') cleanImage = candidate.toString().slice(0, 1000); }
    catch { /* Ignore invalid optional image URLs. */ }
  }
  const entry = {
    id, title: String(title || '').trim().slice(0, 180) || 'Canción de Sonory Lab', tags: toTagArray(tags),
    imageUrl: cleanImage, audioUrl: null, url: parsed.toString(), createdAt: new Date().toISOString(), source: 'manual', pinned: false,
  };
  const manual = await getManualTracks();
  const index = manual.findIndex((track) => track.id === id);
  if (index >= 0) manual[index] = entry; else manual.unshift(entry);
  await writeJson(MANUAL_FILE, manual);
  res.status(201).json({ track: entry, tracks: manual });
});
app.delete('/api/admin/tracks/:id', requireSameOrigin, requireAdmin, async (req, res) => {
  const manual = await getManualTracks();
  const updated = manual.filter((track) => track.id !== req.params.id);
  await writeJson(MANUAL_FILE, updated); res.json({ tracks: updated });
});
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.use((error, req, res, next) => {
  console.error('Error de servidor:', error.message);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Se produjo un error interno.' });
});
app.listen(PORT, () => {
  console.log(`Sonory Lab disponible en http://localhost:${PORT}`);
  console.log(`Perfil de origen: ${PROFILE_URL}`);
});
