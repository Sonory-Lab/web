# Despliegue — Sonory Lab

## Requisitos

- Node.js 18.18 o superior.
- npm.
- Hosting que permita ejecutar un proceso Node.js.
- HTTPS en producción.

Los archivos públicos principales están en la raíz del repositorio. El servidor sirve explícitamente el HTML, PWA e iconos desde esa raíz, pero no publica todos los archivos internos.

## Render

1. Conecta `Sonory-Lab/web` en Render mediante Blueprint.
2. Render utiliza `render.yaml`, instala con `npm install` e inicia con `npm start`.
3. Define `ADMIN_PASSWORD` como secreto de entorno.
4. Despliega y comprueba `/healthz`.
5. Abre `/` y `/admin`.

La plantilla no crea un disco persistente automáticamente. Para conservar entradas manuales, añade un disco persistente y define `DATA_DIR` en su punto de montaje.

## Otro hosting Node

```bash
npm install
npm run check
npm start
```

Configura `NODE_ENV=production`, `ADMIN_PASSWORD`, `SUNO_PROFILE_HANDLE=sonorylab` y un `DATA_DIR` persistente según corresponda. Usa `TRUST_PROXY=true` solo si la aplicación está detrás de un proxy de confianza.

## Verificación

- `/` devuelve el documento HTML raíz.
- `/admin` devuelve el mismo HTML y añade `noindex`.
- `/manifest.webmanifest`, `/sw.js`, `/sonory-logo.svg` y `/app-icon.svg` responden.
- `/api/catalog` devuelve catálogo y estado.
- `/healthz` devuelve el estado del servidor.
- `npm test` ejecuta validación de sintaxis y smoke test HTTP.

## GitHub Pages

GitHub Pages puede servir el HTML como archivo estático, pero no ejecuta `server.js`, las rutas API, sesiones ni sincronización con Suno. Para la plataforma completa se necesita hosting Node.
