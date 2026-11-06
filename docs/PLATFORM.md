# Documentación técnica — Sonory Lab

## Archivos principales en la raíz

| Archivo | Función |
|---|---|
| `index.html` | Documento único que contiene sitio público, panel, CSS y JavaScript |
| `server.js` | API, sincronización Suno, persistencia y seguridad |
| `manifest.webmanifest` | Configuración PWA |
| `sw.js` | Caché offline del HTML y los iconos |
| `sonory-logo.svg` | Logotipo oficial |
| `app-icon.svg` | Favicon e icono PWA |
| `package.json` | Dependencias y comandos |

Los directorios `docs/`, `scripts/`, `data/` y `.github/` contienen únicamente documentación, comprobaciones, datos runtime y automatización de GitHub.

## Documento HTML único

La interfaz pública y el panel administrativo viven en el mismo `index.html`. El CSS está dentro de un bloque `<style>`; los scripts de selección de ruta, interfaz pública y panel están incluidos inline.

- `/` muestra la plataforma musical.
- `/admin` muestra el panel privado, usando exactamente el mismo HTML.
- El navegador no descarga hojas CSS ni scripts frontend separados.

El backend sigue en `server.js`: el navegador no debe recibir credenciales, lógica de sincronización privilegiada ni acceso directo a datos privados.

## CSP por hash

Al iniciar, el servidor lee el HTML de la raíz, extrae los bloques `<script>` y `<style>`, calcula hashes SHA-256 Base64 y los incluye en `script-src` y `style-src`. No utiliza `unsafe-inline`. Tras modificar el CSS o JavaScript inline es necesario reiniciar/reiniciar despliegue para que el servidor calcule los hashes nuevos.

## Recursos de raíz permitidos

El servidor sirve explícitamente:
- `/` → `index.html`
- `/admin` y `/admin/` → el mismo `index.html`, con `noindex`
- `/manifest.webmanifest`
- `/sw.js`
- `/sonory-logo.svg`
- `/app-icon.svg`

No se publica toda la raíz con middleware estático. Así no quedan expuestos por accidente `.env`, `server.js`, `data/`, `docs/` ni scripts internos.

## API

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/catalog` | Catálogo público y estado |
| POST | `/api/sync` | Sincronización manual con cooldown |
| GET | `/api/admin/status` | Estado del panel |
| POST | `/api/admin/login` | Inicio de sesión |
| POST | `/api/admin/logout` | Cierre de sesión |
| GET | `/api/admin/tracks` | Lista de entradas manuales |
| POST | `/api/admin/tracks` | Añade un enlace público de Suno |
| DELETE | `/api/admin/tracks/:id` | Elimina entrada manual |
| GET | `/healthz` | Health check |

## PWA y rendimiento

El manifiesto y el service worker se encuentran en la raíz del repositorio. El service worker almacena el HTML, el manifiesto y los SVG de identidad; las API no se guardan en caché. La interfaz usa fuentes del sistema, portadas con carga diferida y sincronización periódica con la página visible.

## Límites de la integración Suno

El servidor consulta información accesible desde el perfil público de Suno mediante una integración no oficial. Puede cambiar o dejar de responder. En ese caso conserva el último catálogo correcto. Solo se muestran elementos públicos o enlaces públicos añadidos manualmente.
