'use strict';

const PROFILE_URL = 'https://suno.com/@sonorylab';
const FALLBACK_TRACK = {
  id: 'profile-featured-underground-rage',
  title: 'Underground Rage',
  imageUrl: 'https://cdn2.suno.ai/image_large_589c15df-6020-437a-9b89-9e24a1bbd500.jpeg',
  audioUrl: null,
  url: PROFILE_URL,
  tags: ['phonk', 'underground'],
  duration: null,
  createdAt: null,
  source: 'profile-reference',
  pinned: true,
};

const state = { tracks: [], filter: 'all', query: '', sort: 'newest', sync: null, fallback: true };
const els = {
  grid: document.getElementById('trackGrid'), empty: document.getElementById('emptyState'),
  search: document.getElementById('searchInput'), sort: document.getElementById('sortSelect'),
  results: document.getElementById('resultsLabel'), catalogState: document.getElementById('catalogState'),
  connection: document.getElementById('connectionLabel'), lastUpdated: document.getElementById('lastUpdated'),
  trackCount: document.getElementById('trackCount'), statusLed: document.getElementById('statusLed'),
  statusText: document.getElementById('statusText'), syncButton: document.getElementById('syncButton'),
  toast: document.getElementById('toast'), featuredLink: document.getElementById('featuredLink'),
  featuredCover: document.getElementById('featuredCover'), audio: document.getElementById('audioElement'),
  player: document.getElementById('playerBar'), playerTitle: document.getElementById('playerTitle'),
  playerCover: document.getElementById('playerCover'), playPause: document.getElementById('playPause'),
  progress: document.getElementById('progress'), elapsed: document.getElementById('elapsed'),
  duration: document.getElementById('duration'), volume: document.getElementById('volume'),
};
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}
function formatTime(seconds) {
  if (!Number.isFinite(Number(seconds)) || Number(seconds) < 0) return '0:00';
  const whole = Math.floor(Number(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
function formatDate(value) {
  if (!value) return 'PUBLICACIÓN EN SUNO';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'PUBLICACIÓN EN SUNO';
  return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).toUpperCase();
}
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2800);
}
function renderStatus(sync) {
  state.sync = sync || null;
  const ok = sync?.status === 'ok', stale = sync?.status === 'stale', busy = sync?.status === 'syncing';
  els.connection.textContent = ok ? 'CATÁLOGO SINCRONIZADO' : stale ? 'MOSTRANDO ÚLTIMO CATÁLOGO' : busy ? 'CONECTANDO CON SUNO' : 'SIN CONEXIÓN CONFIRMADA';
  els.lastUpdated.textContent = sync?.lastSyncedAt
    ? `ACTUALIZADO ${new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(sync.lastSyncedAt)).toUpperCase()}`
    : 'SIN SINCRONIZACIÓN';
  els.statusLed.classList.toggle('live', ok);
  els.statusText.textContent = ok ? 'FUENTE CONECTADA' : stale ? 'DATOS EN CACHÉ' : busy ? 'SINCRONIZANDO' : 'FUENTE SIN CONFIRMAR';
  els.catalogState.textContent = ok ? 'FUENTE PÚBLICA · ACTUALIZADA' : stale ? 'ÚLTIMA VERSIÓN GUARDADA' : busy ? 'CONSULTANDO FUENTE…' : 'MODO DE REFERENCIA';
}
function currentTracks() {
  let list = [...state.tracks];
  if (state.fallback) list = [FALLBACK_TRACK];
  if (state.filter !== 'all') list = list.filter((track) => (track.tags || []).some((tag) => String(tag).toLowerCase().includes(state.filter)));
  if (state.query) {
    const q = state.query.toLowerCase();
    list = list.filter((track) => `${track.title || ''} ${(track.tags || []).join(' ')}`.toLowerCase().includes(q));
  }
  if (state.sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title, 'es'));
  else list.sort((a, b) => {
    const aDate = Date.parse(a.createdAt || '') || 0, bDate = Date.parse(b.createdAt || '') || 0;
    return state.sort === 'oldest' ? aDate - bDate : bDate - aDate;
  });
  return list;
}
function renderTracks() {
  const list = currentTracks();
  els.trackCount.textContent = state.fallback ? '—' : String(state.tracks.length).padStart(2, '0');
  document.getElementById('allCount').textContent = state.fallback ? '01' : String(state.tracks.length).padStart(2, '0');
  els.results.textContent = `CATÁLOGO PÚBLICO / ${String(list.length).padStart(2, '0')} RESULTADOS`;
  els.grid.innerHTML = '';
  els.empty.hidden = list.length > 0;
  if (!list.length) return;
  for (const track of list) {
    const card = document.createElement('article');
    card.className = 'track-card';
    const cover = track.imageUrl ? `<img src="${escapeHtml(track.imageUrl)}" alt="Portada de ${escapeHtml(track.title)}" loading="lazy">` : '';
    const tags = (track.tags || []).slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    const canPlay = Boolean(track.audioUrl && /^https:\/\//i.test(track.audioUrl));
    const href = track.url && /^https:\/\//i.test(track.url) ? track.url : PROFILE_URL;
    const action = canPlay
      ? `<button class="track-action play-track" type="button" data-track="${escapeHtml(track.id)}">▶ REPRODUCIR</button>`
      : `<a class="track-action" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">↗ ESCUCHAR EN SUNO</a>`;
    card.innerHTML = `<div class="track-art">${cover}<span class="art-fallback">⌁</span><span class="track-source">${track.source === 'manual' ? 'CURATED' : track.source === 'profile-reference' ? 'PINNED' : 'SUNO / PUBLIC'}</span></div><div class="track-content"><h3 class="track-title" title="${escapeHtml(track.title)}">${escapeHtml(track.title || 'Untitled')}</h3><div class="track-date">${escapeHtml(formatDate(track.createdAt))}</div><div class="track-tags">${tags || '<span>SONORY LAB</span>'}</div>${action}${track.duration ? `<span class="track-duration">${formatTime(track.duration)}</span>` : ''}</div>`;
    const image = card.querySelector('.track-art img');
    if (image) {
      image.addEventListener('load', () => card.querySelector('.art-fallback')?.remove(), { once: true });
      image.addEventListener('error', () => image.remove(), { once: true });
    }
    card.querySelector('.play-track')?.addEventListener('click', () => playTrack(track));
    els.grid.appendChild(card);
  }
}
function updateFilters() {
  document.querySelectorAll('.filter-chip').forEach((button) => button.classList.toggle('active', button.dataset.filter === state.filter));
}
async function loadCatalog({ force = false, quiet = false } = {}) {
  if (force) { els.syncButton.disabled = true; els.syncButton.innerHTML = '<span class="sync-icon">↻</span> SINCRONIZANDO…'; }
  try {
    const response = force
      ? await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      : await fetch('/api/catalog', { cache: 'no-store' });
    const data = await response.json();
    if (Array.isArray(data.tracks)) { state.tracks = data.tracks; state.fallback = data.tracks.length === 0; }
    renderStatus(data.sync); renderTracks();
    if (force) showToast(data.sync?.status === 'ok' ? 'Catálogo actualizado desde Suno.' : data.sync?.message || 'No se pudo actualizar el catálogo.');
  } catch (error) {
    state.fallback = state.tracks.length === 0; renderStatus({ status: 'error' }); renderTracks();
    if (!quiet) showToast('No se pudo conectar con el servidor del catálogo.');
  } finally {
    if (force) { els.syncButton.disabled = false; els.syncButton.innerHTML = '<span class="sync-icon">↻</span> SINCRONIZAR AHORA'; }
  }
}
function playTrack(track) {
  if (!track.audioUrl) return;
  els.audio.src = track.audioUrl; els.audio.volume = Number(els.volume.value || 0.85);
  els.playerTitle.textContent = track.title || 'Untitled'; els.playerCover.src = track.imageUrl || '';
  els.player.hidden = false;
  els.audio.play().then(() => { els.playPause.textContent = 'Ⅱ'; }).catch(() => showToast('El navegador no pudo reproducir este audio.'));
}
els.search.addEventListener('input', (event) => { state.query = event.target.value.trim(); renderTracks(); });
els.sort.addEventListener('change', (event) => { state.sort = event.target.value; renderTracks(); });
document.getElementById('filterButtons').addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]'); if (!button) return;
  state.filter = button.dataset.filter; updateFilters(); renderTracks();
});
document.querySelectorAll('[data-style-link]').forEach((link) => link.addEventListener('click', () => { state.filter = link.dataset.styleLink; updateFilters(); renderTracks(); }));
els.syncButton.addEventListener('click', () => loadCatalog({ force: true }));
els.playPause.addEventListener('click', () => {
  if (els.audio.paused) els.audio.play().then(() => { els.playPause.textContent = 'Ⅱ'; }).catch(() => showToast('No se pudo reproducir el audio.'));
  else { els.audio.pause(); els.playPause.textContent = '▶'; }
});
els.audio.addEventListener('timeupdate', () => {
  if (!els.audio.duration) return;
  els.progress.value = String((els.audio.currentTime / els.audio.duration) * 100);
  els.elapsed.textContent = formatTime(els.audio.currentTime); els.duration.textContent = formatTime(els.audio.duration);
});
els.audio.addEventListener('ended', () => { els.playPause.textContent = '▶'; els.progress.value = '0'; });
els.progress.addEventListener('input', () => { if (els.audio.duration) els.audio.currentTime = (Number(els.progress.value) / 100) * els.audio.duration; });
els.volume.addEventListener('input', () => { els.audio.volume = Number(els.volume.value); });
document.getElementById('menuToggle').addEventListener('click', (event) => {
  const nav = document.querySelector('.main-nav'); nav.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(nav.classList.contains('open')));
});
document.querySelectorAll('.main-nav a').forEach((link) => link.addEventListener('click', () => document.querySelector('.main-nav').classList.remove('open')));
document.getElementById('year').textContent = new Date().getFullYear();
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); els.search.focus(); }
});
loadCatalog();
setInterval(() => loadCatalog({ quiet: true }), 60000);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => showToast('La aplicación seguirá funcionando en modo web.')));
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); deferredInstallPrompt = event;
  const button = document.getElementById('installAppButton'); if (button) button.hidden = false;
});
document.getElementById('installAppButton')?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null;
});
