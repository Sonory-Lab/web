'use strict';
require('dotenv').config();
const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const app = express();
const PORT = Number(process.env.PORT || 3100);
const PUBLIC = path.join(__dirname, 'public');
const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const DB = path.join(DATA, 'campaigns.json');
const PASSWORD = String(process.env.ADMIN_PASSWORD || '');
const GRAPH = String(process.env.META_GRAPH_VERSION || 'v26.0').replace(/[^v0-9.]/g, '');
const CHANNELS = ['whatsapp', 'telegram', 'facebook', 'instagram', 'messenger'];
const sessions = new Map();
const attempts = new Map();
const running = new Set();

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'; font-src 'self' data:"
  });
  if (req.path.startsWith('/api')) res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
  next();
});
app.use(express.json({ limit: '100kb', strict: true }));

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function sessionOf(req) {
  const match = String(req.headers.cookie || '').match(/(?:^|;\s*)nexo_session=([a-f0-9]{64})/);
  if (!match) return null;
  const value = sessions.get(match[1]);
  if (!value || value.expires < Date.now()) { sessions.delete(match[1]); return null; }
  return { token: match[1], value };
}
function auth(req, res, next) {
  const current = sessionOf(req);
  if (!current) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  req.sessionToken = current.token;
  next();
}
function sameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Origen no permitido.' });
    } catch { return res.status(403).json({ error: 'Origen no válido.' }); }
  }
  next();
}
const clean = (v, n = 4000) => typeof v === 'string' ? v.trim().slice(0, n) : '';
function list(v, max = 100, size = 128) {
  return Array.isArray(v) ? [...new Set(v.map(x => String(x).trim().slice(0, size)).filter(Boolean))].slice(0, max) : [];
}
function httpsUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password &&
      !['localhost', '127.0.0.1', '::1'].includes(u.hostname.toLowerCase()) &&
      !u.hostname.toLowerCase().endsWith('.local');
  } catch { return false; }
}
async function readDb() {
  await fs.mkdir(DATA, { recursive: true, mode: 0o700 });
  try {
    const value = JSON.parse(await fs.readFile(DB, 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('No se pudo leer la base JSON:', e.message);
    return [];
  }
}
async function writeDb(value) {
  await fs.mkdir(DATA, { recursive: true, mode: 0o700 });
  const tmp = DB + '.' + process.pid + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  await fs.rename(tmp, DB);
}
function providers() {
  const meta = Boolean(process.env.META_ACCESS_TOKEN);
  return [
    { id: 'whatsapp', name: 'WhatsApp Business', configured: Boolean(process.env.WA_ACCESS_TOKEN && process.env.WA_PHONE_NUMBER_ID), detail: 'Plantillas aprobadas para contactos con consentimiento.' },
    { id: 'telegram', name: 'Telegram', configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID), detail: 'Publicación en el canal o grupo configurado.' },
    { id: 'facebook', name: 'Facebook Pages', configured: Boolean(meta && process.env.META_PAGE_ID), detail: 'Publicaciones en una Página, no en perfiles personales.' },
    { id: 'instagram', name: 'Instagram', configured: Boolean(meta && process.env.INSTAGRAM_USER_ID), detail: 'Imágenes en cuentas profesionales habilitadas.' },
    { id: 'messenger', name: 'Messenger', configured: Boolean(process.env.MESSENGER_PAGE_ACCESS_TOKEN), detail: 'Mensajes a PSID elegibles dentro de la ventana permitida.' }
  ];
}
async function metaPost(endpoint, token, payload, version = GRAPH) {
  const response = await fetch('https://graph.facebook.com/' + version + '/' + endpoint.replace(/^\//, ''), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error?.message || 'Meta rechazó la solicitud.');
  return data;
}
async function sendFacebook(c) {
  const token = process.env.META_ACCESS_TOKEN, page = process.env.META_PAGE_ID;
  if (!token || !page) throw new Error('Configura META_ACCESS_TOKEN y META_PAGE_ID.');
  const data = c.mediaUrl
    ? await metaPost(page + '/photos', token, { url: c.mediaUrl, caption: c.text })
    : await metaPost(page + '/feed', token, { message: c.text });
  return { message: 'Publicado en Facebook Page.', id: data.id || data.post_id || null };
}
async function sendInstagram(c) {
  const token = process.env.META_ACCESS_TOKEN, account = process.env.INSTAGRAM_USER_ID;
  if (!token || !account) throw new Error('Configura META_ACCESS_TOKEN e INSTAGRAM_USER_ID.');
  if (!c.mediaUrl || !httpsUrl(c.mediaUrl)) throw new Error('Instagram necesita una imagen con URL HTTPS pública.');
  const container = await metaPost(account + '/media', token, { image_url: c.mediaUrl, caption: c.text });
  if (!container.id) throw new Error('Instagram no devolvió un contenedor.');
  const result = await metaPost(account + '/media_publish', token, { creation_id: container.id });
  return { message: 'Publicación enviada a Instagram.', id: result.id || null };
}
async function sendTelegram(c) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) throw new Error('Configura TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID.');
  const method = c.mediaUrl ? 'sendPhoto' : 'sendMessage';
  const payload = c.mediaUrl ? { chat_id: chat, photo: c.mediaUrl, caption: c.text } : { chat_id: chat, text: c.text };
  const response = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.description || 'Telegram rechazó la publicación.');
  return { message: 'Enviado a Telegram.', id: String(data.result?.message_id || '') };
}
async function sendWhatsApp(c) {
  const token = process.env.WA_ACCESS_TOKEN, phoneId = process.env.WA_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error('Configura WA_ACCESS_TOKEN y WA_PHONE_NUMBER_ID.');
  if (!c.consentConfirmed) throw new Error('Confirma el consentimiento de todos los destinatarios.');
  const templateName = clean(c.templateName || process.env.WA_TEMPLATE_NAME, 128);
  if (!templateName) throw new Error('Indica el nombre de una plantilla de WhatsApp aprobada.');
  if (!(c.whatsappRecipients || []).length) throw new Error('Añade teléfonos en formato internacional E.164.');
  const version = String(process.env.WA_API_VERSION || GRAPH).replace(/[^v0-9.]/g, '');
  const params = list(c.templateParams, 10, 512).map(text => ({ type: 'text', text }));
  const template = { name: templateName, language: { code: clean(c.templateLanguage || 'es', 16) } };
  if (params.length) template.components = [{ type: 'body', parameters: params }];
  const results = [];
  for (const raw of (c.whatsappRecipients || [])) {
    const phone = raw.replace(/[^\d+]/g, '');
    if (!phone.startsWith('+') || phone.length < 8) {
      results.push({ destination: raw, ok: false, error: 'Número no válido: usa E.164.' });
      continue;
    }
    if (phone.startsWith('+1')) {
      results.push({ destination: phone, ok: false, error: 'Las plantillas de marketing de WhatsApp están restringidas para números +1. Verifica la política vigente.' });
      continue;
    }
    try {
      const response = await fetch('https://graph.facebook.com/' + version + '/' + phoneId + '/messages', {
        method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone.slice(1), type: 'template', template }),
        signal: AbortSignal.timeout(30000)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) throw new Error(data.error?.message || 'WhatsApp rechazó el mensaje.');
      results.push({ destination: phone, ok: true, id: data.messages?.[0]?.id || null });
    } catch (e) { results.push({ destination: phone, ok: false, error: e.message }); }
  }
  const sent = results.filter(x => x.ok).length;
  if (!sent) throw new Error(results.map(x => x.error).filter(Boolean).join(' | ') || 'No se pudo enviar ningún mensaje.');
  return { message: 'WhatsApp: ' + sent + ' de ' + results.length + ' mensajes enviados.', sent, total: results.length, details: results };
}
async function sendMessenger(c) {
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error('Configura MESSENGER_PAGE_ACCESS_TOKEN.');
  if (!c.consentConfirmed) throw new Error('Confirma el consentimiento de los destinatarios.');
  if (!c.messengerWindowConfirmed) throw new Error('Confirma que los destinatarios están dentro de la ventana permitida.');
  const recipients = (c.messengerRecipients || []).length ? c.messengerRecipients : [String(process.env.MESSENGER_DEFAULT_RECIPIENT || '')].filter(Boolean);
  if (!recipients.length) throw new Error('Añade un PSID de Messenger.');
  const results = [];
  for (const recipient of recipients) {
    try {
      const data = await metaPost('me/messages', token, {
        recipient: { id: recipient }, messaging_type: 'RESPONSE', message: { text: c.text }
      });
      results.push({ destination: recipient, ok: true, id: data.message_id || null });
    } catch (e) { results.push({ destination: recipient, ok: false, error: e.message }); }
  }
  const sent = results.filter(x => x.ok).length;
  if (!sent) throw new Error(results.map(x => x.error).filter(Boolean).join(' | ') || 'No se pudo enviar ningún mensaje.');
  return { message: 'Messenger: ' + sent + ' de ' + results.length + ' mensajes enviados.', sent, total: results.length, details: results };
}
async function publishOne(channel, campaign) {
  if (channel === 'facebook') return sendFacebook(campaign);
  if (channel === 'instagram') return sendInstagram(campaign);
  if (channel === 'telegram') return sendTelegram(campaign);
  if (channel === 'whatsapp') return sendWhatsApp(campaign);
  if (channel === 'messenger') return sendMessenger(campaign);
  throw new Error('Canal no reconocido.');
}
async function execute(id) {
  if (running.has(id)) return null;
  running.add(id);
  try {
    let db = await readDb();
    let index = db.findIndex(x => x.id === id);
    if (index < 0 || ['published', 'publishing'].includes(db[index].status)) return db[index] || null;
    db[index].status = 'publishing';
    db[index].updatedAt = new Date().toISOString();
    await writeDb(db);
    const results = [];
    for (const channel of db[index].channels) {
      try { results.push({ channel, ok: true, ...(await publishOne(channel, db[index])), at: new Date().toISOString() }); }
      catch (e) { results.push({ channel, ok: false, error: e.message, at: new Date().toISOString() }); }
    }
    db = await readDb();
    index = db.findIndex(x => x.id === id);
    if (index < 0) return null;
    const successes = results.filter(x => x.ok).length;
    db[index].results = results;
    db[index].status = successes === results.length ? 'published' : successes ? 'partial' : 'failed';
    db[index].publishedAt = successes ? new Date().toISOString() : null;
    db[index].updatedAt = new Date().toISOString();
    await writeDb(db);
    return db[index];
  } finally { running.delete(id); }
}
async function scheduleTick() {
  try {
    const db = await readDb(), now = Date.now();
    for (const item of db.filter(x => x.status === 'scheduled' && x.scheduleAt && Date.parse(x.scheduleAt) <= now)) {
      await execute(item.id);
    }
  } catch (e) { console.error('Scheduler:', e.message); }
}

app.get('/api/session', (req, res) => res.json({ authenticated: Boolean(sessionOf(req)), passwordConfigured: Boolean(PASSWORD) }));
app.post('/api/login', sameOrigin, (req, res) => {
  const ip = req.ip || 'unknown', now = Date.now();
  const item = attempts.get(ip) || { count: 0, until: now + 900000 };
  if (item.until < now) { item.count = 0; item.until = now + 900000; }
  if (item.count >= 8) return res.status(429).json({ error: 'Demasiados intentos. Vuelve a probar más tarde.' });
  if (!PASSWORD) return res.status(503).json({ error: 'Configura ADMIN_PASSWORD en .env.' });
  if (!safeEqual(req.body?.password || '', PASSWORD)) {
    item.count++; attempts.set(ip, item);
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }
  attempts.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { expires: now + 12 * 60 * 60 * 1000 });
  res.setHeader('Set-Cookie', 'nexo_session=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200' + (process.env.NODE_ENV === 'production' ? '; Secure' : ''));
  res.json({ ok: true });
});
app.post('/api/logout', sameOrigin, auth, (req, res) => {
  sessions.delete(req.sessionToken);
  res.setHeader('Set-Cookie', 'nexo_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' + (process.env.NODE_ENV === 'production' ? '; Secure' : ''));
  res.json({ ok: true });
});
app.get('/api/health', (req, res) => res.json({ ok: true, passwordConfigured: Boolean(PASSWORD) }));
app.use('/api', auth);
app.get('/api/integrations', (req, res) => res.json({ integrations: providers(), graphVersion: GRAPH }));
app.get('/api/campaigns', async (req, res, next) => {
  try { const campaigns = await readDb(); campaigns.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))); res.json({ campaigns }); }
  catch (e) { next(e); }
});
app.post('/api/campaigns', sameOrigin, async (req, res, next) => {
  try {
    const b = req.body || {}, title = clean(b.title, 120), text = clean(b.text);
    const channels = list(b.channels, 5, 24).filter(x => CHANNELS.includes(x));
    const mediaUrl = clean(b.mediaUrl, 2048), whatsappRecipients = list(b.whatsappRecipients, 100, 128), messengerRecipients = list(b.messengerRecipients, 100, 128);
    const scheduleAt = b.scheduleAt ? new Date(b.scheduleAt) : null;
    if (!title || !text || !channels.length) return res.status(400).json({ error: 'Añade nombre, contenido y al menos un canal.' });
    if (mediaUrl && !httpsUrl(mediaUrl)) return res.status(400).json({ error: 'La imagen debe tener una URL HTTPS pública.' });
    if (scheduleAt && (!Number.isFinite(scheduleAt.getTime()) || scheduleAt.getTime() <= Date.now())) return res.status(400).json({ error: 'La fecha programada debe estar en el futuro.' });
    const campaign = {
      id: crypto.randomUUID(), title, text, channels, mediaUrl: mediaUrl || null, whatsappRecipients, messengerRecipients,
      templateName: clean(b.templateName, 128), templateLanguage: clean(b.templateLanguage || 'es', 16),
      templateParams: list(b.templateParams, 10, 512), consentConfirmed: b.consentConfirmed === true,
      messengerWindowConfirmed: b.messengerWindowConfirmed === true,
      scheduleAt: scheduleAt ? scheduleAt.toISOString() : null, status: scheduleAt ? 'scheduled' : 'draft',
      results: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), publishedAt: null
    };
    const db = await readDb(); db.push(campaign); await writeDb(db);
    res.status(201).json({ campaign });
  } catch (e) { next(e); }
});
app.post('/api/campaigns/:id/publish', sameOrigin, async (req, res, next) => {
  try {
    const db = await readDb(), campaign = db.find(x => x.id === req.params.id);
    if (!campaign) return res.status(404).json({ error: 'No se encontró la campaña.' });
    if (['published', 'publishing'].includes(campaign.status)) return res.status(409).json({ error: 'La campaña ya está publicada o en proceso.' });
    campaign.status = 'draft'; campaign.scheduleAt = null; campaign.updatedAt = new Date().toISOString();
    await writeDb(db);
    res.json({ campaign: await execute(campaign.id) });
  } catch (e) { next(e); }
});
app.delete('/api/campaigns/:id', sameOrigin, async (req, res, next) => {
  try {
    const db = await readDb(), item = db.find(x => x.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'No se encontró la campaña.' });
    if (!['draft', 'failed'].includes(item.status)) return res.status(409).json({ error: 'Solo se eliminan borradores o campañas fallidas.' });
    await writeDb(db.filter(x => x.id !== item.id)); res.json({ ok: true });
  } catch (e) { next(e); }
});
app.get('/api/metrics', async (req, res, next) => {
  try {
    const db = await readDb();
    res.json({
      total: db.length,
      scheduled: db.filter(x => x.status === 'scheduled').length,
      published: db.filter(x => x.status === 'published').length,
      attention: db.filter(x => ['partial', 'failed'].includes(x.status)).length
    });
  } catch (e) { next(e); }
});
app.get('/', (req, res) => { res.set('Cache-Control', 'no-cache'); res.sendFile(path.join(PUBLIC, 'index.html')); });
app.use(express.static(PUBLIC, { etag: true, maxAge: '1h' }));
app.use((req, res) => req.path.startsWith('/api/') ? res.status(404).json({ error: 'Ruta no encontrada.' }) : res.status(404).send('No encontrado'));
app.use((e, req, res, next) => {
  console.error('Error:', e.message);
  if (res.headersSent) return next(e);
  res.status(500).json({ error: 'Error interno del servidor. Revisa los registros.' });
});
const timer = setInterval(scheduleTick, 15000); timer.unref(); scheduleTick();
if (require.main === module) app.listen(PORT, () => console.log('NEXO Marketing en http://localhost:' + PORT));
module.exports = app;
