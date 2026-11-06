# Documentación técnica — Sonory Lab

## Arquitectura

La interfaz de Sonory Lab está consolidada en un único documento: `public/index.html`. Este documento contiene HTML, CSS en un bloque `<style>` y JavaScript inline. Integra dos vistas:

- Sitio público en `/`.
- Panel administrativo en `/admin`.

El servidor Node.js + Express sigue siendo una parte independiente del proyecto. Publica el HTML, ejecuta las API, consulta Suno y protege las operaciones administrativas. No es posible mover estas responsabilidades al HTML sin exponer secretos y eliminar la persistencia del servidor.

## Estructura

| Ruta | Responsabilidad |
|---|---|
| `public/index.html` | Documento único de interfaz, estilos, lógica pública y panel admin |
| `public/manifest.webmanifest` | Nombre, icono y configuración de instalación PWA |
| `public/sw.js` | Caché offline del documento y recursos estáticos |
| `public/assets/sonory-logo.svg` | Logotipo de la plataforma |
| `public/assets/app-icon.svg` | Favicon e icono PWA |
| `server/index.js` | Servidor, API, sincronización, persistencia y seguridad |
| `data/catalog.json` | Último catálogo público correcto |
| `data/manual-tracks.json` | Enlaces manuales del panel |
| `scripts/check-inline.js` | Valida la sintaxis JavaScript inline |
| `scripts/smoke-test.js` | Comprueba las rutas HTTP, CSP y sesión admin |
| `docs/DEPLOYMENT.md` | Instrucciones de publicación |

Los JSON de `data/` se generan en ejecución y se excluyen de Git.

## Selección de vista

Un pequeño script del `head` detecta la ruta `/admin` y añade la clase `admin-route` al elemento HTML. El CSS muestra exclusivamente la vista correspondiente. El script de aplicación ejecuta la lógica pública o la lógica administrativa según esa misma ruta.

Las dos vistas comparten el documento pero mantienen sus formularios y lógica de cliente separados en bloques de código dentro de él.

## Política CSP para código inline

El servidor lee `public/index.html` al iniciar. Extrae los bloques `<script>` y `<style>`, calcula sus hashes SHA-256 en Base64 y los incluye en `script-src` y `style-src`. Así se permite únicamente el código inline exacto que forma parte de la versión publicada, sin usar `unsafe-inline`.

**Importante:** si editas el HTML inline, reinicia o vuelve a desplegar el servidor para que vuelva a calcular los hashes.

## Rutas HTTP

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/` | Sitio público | Público |
| GET | `/admin` y `/admin/` | Vista administrativa del mismo HTML | Inicio de sesión |
| GET | `/healthz` | Estado del servicio | Público |
| GET | `/api/catalog` | Catálogo y estado de sincronización | Público |
| POST | `/api/sync` | Solicita sincronización manual con cooldown | Público |
| GET | `/api/admin/status` | Estado de configuración y sesión | Público |
| POST | `/api/admin/login` | Inicio de sesión | Mismo origen |
| POST | `/api/admin/logout` | Cierre de sesión | Administrador |
| GET | `/api/admin/tracks` | Lista entradas manuales | Administrador |
| POST | `/api/admin/tracks` | Añade o actualiza enlace público | Administrador |
| DELETE | `/api/admin/tracks/:id` | Elimina una entrada manual | Administrador |

## Rendimiento y adaptación

- CSS y JavaScript frontend se cargan dentro del único HTML, eliminando las cuatro solicitudes de los archivos frontend independientes.
- Se sustituyeron las fuentes web externas por pilas de fuentes del sistema para evitar solicitudes a proveedores de tipografía.
- Las portadas del catálogo usan carga diferida y decodificación asíncrona.
- La sincronización periódica se reduce a una consulta cada dos minutos y se omite en intervalos en los que la página no está visible.
- Se añaden ajustes para teléfonos estrechos, orientación horizontal, áreas seguras y movimiento reducido.
- El service worker usa un nombre de caché nuevo para no reutilizar la estructura anterior.

## API y sincronización de Suno

1. `/api/catalog` comprueba si el caché expiró.
2. El servidor consulta páginas públicas del perfil.
3. Normaliza ID, título, portada, audio, etiquetas, duración y fecha.
4. Deduplica por ID, conserva el último catálogo correcto y combina las entradas manuales.
5. La interfaz actualiza la lista pública.

La integración no es una API oficial documentada y puede cambiar. Si falla, se conserva el último catálogo válido. No se accede a contenido privado ni Link Only.

## Reproductor

El reproductor aparece cuando la fuente ofrece una URL HTTPS de audio. Si no hay audio disponible, la tarjeta ofrece un enlace para escuchar en Suno. La reproducción depende de los códecs y las políticas del navegador.

## Panel administrativo

Configura `ADMIN_PASSWORD` en el entorno del servidor. Abre `/admin`, inicia sesión y añade enlaces `https://suno.com/song/...`. Los datos se guardan en `data/manual-tracks.json`. Sin la variable de entorno, las escrituras quedan deshabilitadas.

## PWA y modo sin conexión

El manifiesto y el service worker permanecen como archivos separados y permiten instalar la plataforma. El service worker almacena el HTML unificado y los iconos; no intercepta la API. El catálogo necesita conexión y el modo offline no garantiza disponibilidad de audio Suno.

## Límite de la unificación

La interfaz está unificada en HTML, pero el proyecto no puede convertirse íntegramente en un único HTML seguro: el servidor, la persistencia, las credenciales, la PWA y la configuración de despliegue requieren componentes separados.
