'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const port = 32000 + Math.floor(Math.random() * 20000);
const origin = 'http://127.0.0.1:' + port;
const dataDir = path.join(os.tmpdir(), 'sonory-lab-smoke-' + process.pid);
const password = 'smoke-test-' + process.pid + '-OnlyForCI';
const child = spawn(process.execPath, ['server/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'test',
    ADMIN_PASSWORD: password,
    DATA_DIR: dataDir,
    SUNO_PROFILE_HANDLE: 'sonorylab',
  },
  stdio: 'ignore',
});

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url, options) {
  return fetch(origin + url, { ...options, signal: AbortSignal.timeout(3000) });
}

async function main() {
  try {
    let healthy = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (child.exitCode !== null) throw new Error('El servidor terminó antes de responder.');
      try {
        const response = await request('/healthz');
        if (response.ok) {
          const health = await response.json();
          if (health.ok === true) healthy = true;
          break;
        }
      } catch {
        await pause(150);
      }
    }
    if (!healthy) throw new Error('El endpoint /healthz no estuvo disponible.');

    const [home, admin] = await Promise.all([request('/'), request('/admin')]);
    if (!home.ok || !admin.ok) throw new Error('La ruta pública o /admin no respondió correctamente.');
    const [homeHtml, adminHtml] = await Promise.all([home.text(), admin.text()]);
    if (homeHtml !== adminHtml) throw new Error('La ruta /admin no está sirviendo el mismo documento HTML.');
    if (!homeHtml.includes('id="publicExperience"') || !homeHtml.includes('id="adminExperience"')) {
      throw new Error('El HTML no contiene ambas vistas integradas.');
    }

    const csp = home.headers.get('content-security-policy') || '';
    const hashes = (csp.match(/'sha256-/g) || []).length;
    if (hashes < 3) throw new Error('La CSP no autorizó los hashes inline esperados.');
    if (!(admin.headers.get('x-robots-tag') || '').includes('noindex')) {
      throw new Error('La ruta administrativa no tiene X-Robots-Tag noindex.');
    }

    const login = await request('/api/admin/login', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!login.ok) throw new Error('No se pudo iniciar sesión en la prueba administrativa.');
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    if (!cookie.startsWith('sonory_admin=')) throw new Error('La sesión no creó la cookie esperada.');

    const status = await request('/api/admin/status', { headers: { cookie } });
    const session = await status.json();
    if (!status.ok || session.authenticated !== true) throw new Error('La sesión administrativa no se validó.');

    console.log('Smoke test correcto: servidor, HTML único, CSP, rutas y sesión admin.');
  } finally {
    child.kill('SIGTERM');
    await pause(150);
    await fs.rm(dataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
