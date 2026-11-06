'use strict';
const $ = (id) => document.getElementById(id);
const loginCard = $('loginCard');
const manageCard = $('manageCard');

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);
  return data;
}

async function loadManual() {
  try {
    const data = await request('/api/admin/tracks');
    $('manualList').innerHTML = '';
    if (!data.tracks.length) {
      $('manualList').textContent = 'Todavía no hay entradas manuales.';
      return;
    }
    for (const track of data.tracks) {
      const item = document.createElement('div');
      item.className = 'admin-track';
      const info = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = track.title;
      const link = document.createElement('a');
      link.href = track.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'ABRIR EN SUNO ↗';
      info.append(strong, link);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'ELIMINAR';
      remove.addEventListener('click', async () => {
        if (!window.confirm(`¿Eliminar “${track.title}” de las entradas manuales?`)) return;
        try { await request(`/api/admin/tracks/${encodeURIComponent(track.id)}`, { method: 'DELETE' }); await loadManual(); }
        catch (error) { $('trackMessage').textContent = error.message; }
      });
      item.append(info, remove);
      $('manualList').append(item);
    }
  } catch (error) { $('trackMessage').textContent = error.message; }
}

async function checkStatus() {
  try {
    const status = await request('/api/admin/status');
    if (!status.configured) {
      $('loginMessage').textContent = 'Panel deshabilitado: define ADMIN_PASSWORD en el entorno del servidor.';
      $('password').disabled = true;
      $('loginForm').querySelector('button').disabled = true;
    } else if (status.authenticated) {
      loginCard.hidden = true;
      manageCard.hidden = false;
      await loadManual();
    }
  } catch (error) { $('loginMessage').textContent = error.message; }
}

$('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('loginMessage').textContent = 'Verificando…';
  try {
    await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) });
    loginCard.hidden = true;
    manageCard.hidden = false;
    $('password').value = '';
    await loadManual();
  } catch (error) { $('loginMessage').textContent = error.message; }
});

$('trackForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('trackMessage').textContent = 'Guardando…';
  try {
    await request('/api/admin/tracks', {
      method: 'POST',
      body: JSON.stringify({
        url: $('songUrl').value.trim(),
        title: $('songTitle').value.trim(),
        tags: $('songTags').value.trim(),
        imageUrl: $('songImage').value.trim(),
      }),
    });
    $('trackForm').reset();
    $('trackMessage').textContent = 'Canción añadida al catálogo manual.';
    await loadManual();
  } catch (error) { $('trackMessage').textContent = error.message; }
});

$('refreshManual').addEventListener('click', loadManual);
$('logoutButton').addEventListener('click', async () => {
  try { await request('/api/admin/logout', { method: 'POST', body: '{}' }); }
  finally { manageCard.hidden = true; loginCard.hidden = false; }
});
checkStatus();
