# Despliegue de Sonory Lab

## Hosting requerido

La aplicación necesita Node.js 18.18+ y un proceso de servidor. GitHub Pages solo sirve archivos estáticos: no ejecuta Express, las rutas `/api/*`, el panel ni la sincronización con Suno.

## Render

El repositorio incluye `render.yaml` como configuración inicial de servicio:

1. Sube el repositorio a GitHub.
2. En Render, crea un Blueprint y selecciona este repositorio.
3. Configura `ADMIN_PASSWORD` como secreto en el panel de Render. No lo escribas en el YAML ni en Git.
4. Despliega y comprueba que `/healthz` responda correctamente.
5. Abre la URL HTTPS de Render y prueba `/`, `/api/catalog` y `/admin`.

La plantilla usa el plan gratuito y **no crea almacenamiento persistente**. Para conservar entradas manuales entre reinicios y despliegues, añade un disco persistente en el proveedor, monta una ruta (por ejemplo `/var/data`) y define `DATA_DIR=/var/data`. El almacenamiento persistente puede tener coste según el proveedor y el plan.

## Despliegue genérico Node.js

1. Instala Node.js 18.18 o superior.
2. Ejecuta `npm install`.
3. Define `NODE_ENV=production`, `ADMIN_PASSWORD`, `SUNO_PROFILE_HANDLE=sonorylab`, `CACHE_TTL_SECONDS=300` y, si procede, `DATA_DIR`.
4. Ejecuta `npm start`.
5. Coloca un proxy HTTPS delante del servidor. Configura `TRUST_PROXY=true` solo si el proxy es de confianza y administra las cabeceras reenviadas.

## Dominio y HTTPS

Configura el dominio en el proveedor y activa HTTPS. El servidor añade la cookie `Secure` cuando `NODE_ENV=production`. No expongas el panel administrativo por HTTP.

## Verificación

- `GET /healthz` devuelve `{ "ok": true }`.
- `/` muestra la página pública.
- `/api/catalog` devuelve `tracks` y `sync`.
- `/admin` muestra el inicio de sesión.
- Sin `ADMIN_PASSWORD`, el panel no permite escrituras.
- Tras configurar la contraseña, las operaciones del panel requieren sesión y origen del mismo sitio.
