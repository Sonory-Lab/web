# Documentación técnica — Sonory Lab

## Arquitectura

Sonory Lab es una aplicación de servidor Node.js + Express. Express publica los archivos de `public/` y ofrece la API local bajo `/api/*`. El navegador no consulta directamente la API interna de Suno: solicita el catálogo al mismo servidor y este realiza la consulta externa.

### Componentes

| Ruta | Responsabilidad |
|---|---|
| `public/index.html` | Página pública |
| `public/styles.css` | Estilos y diseño adaptable |
| `public/app.js` | Catálogo, búsqueda, filtros, sincronización y reproductor |
| `public/admin.html` | Interfaz del panel privado |
| `public/admin.css` | Estilos del panel |
| `public/admin.js` | Inicio de sesión y gestión de entradas manuales |
| `public/assets/` | Logotipo e icono SVG servidos al navegador |
| `public/manifest.webmanifest` | Metadatos PWA |
| `public/sw.js` | Caché del shell PWA |
| `server/index.js` | API, sincronización, persistencia y medidas de seguridad |
| `data/catalog.json` | Último catálogo público correcto |
| `data/manual-tracks.json` | Enlaces públicos añadidos en el panel |

Los JSON de `data/` se generan en ejecución y están excluidos del control de versiones.

## Rutas HTTP

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/` | Sitio público | Público |
| GET | `/admin` | Panel privado | Inicio de sesión |
| GET | `/healthz` | Health check del hosting | Público |
| GET | `/api/catalog` | Catálogo y estado de sincronización | Público |
| POST | `/api/sync` | Solicita sincronización manual con cooldown | Público |
| GET | `/api/admin/status` | Estado de configuración/sesión | Público |
| POST | `/api/admin/login` | Inicio de sesión | Mismo origen |
| POST | `/api/admin/logout` | Cierre de sesión | Administrador |
| GET | `/api/admin/tracks` | Lista entradas manuales | Administrador |
| POST | `/api/admin/tracks` | Añade/actualiza enlace público de Suno | Administrador |
| DELETE | `/api/admin/tracks/:id` | Elimina una entrada manual | Administrador |

## Catálogo y sincronización

1. `/api/catalog` comprueba si el caché está vencido.
2. El servidor consulta hasta ocho páginas del perfil público.
3. Normaliza ID, título, imagen, audio, etiquetas, duración y fecha.
4. Deduplica por ID y ordena por fecha.
5. Guarda el último catálogo correcto de forma atómica.
6. Combina las publicaciones públicas con entradas manuales.

Las solicitudes simultáneas de sincronización comparten la misma promesa. Las peticiones manuales tienen un período de enfriamiento para evitar llamadas repetidas.

Si la fuente externa falla, la respuesta conserva el estado del último catálogo correcto. La interfaz distingue catálogo actualizado, caché anterior y error de conexión.

## Reproductor

El reproductor aparece cuando la fuente entrega una URL HTTPS de audio. Si no existe una URL reproducible, la tarjeta ofrece un enlace a la publicación pública en Suno. La compatibilidad de reproducción depende del códec admitido por el navegador.

La aplicación no descarga ni almacena copias locales de las canciones. La reproducción se realiza desde la URL pública proporcionada por la fuente.

## Panel privado

1. Define `ADMIN_PASSWORD` en el entorno del servidor.
2. Abre `/admin`.
3. Inicia sesión.
4. Añade una URL `https://suno.com/song/...` y, si procede, título, estilos y portada.
5. La entrada se almacena en `data/manual-tracks.json`.
6. Usa «Cerrar sesión» para invalidar el token de esa sesión.

Sin `ADMIN_PASSWORD`, las escrituras administrativas quedan deshabilitadas. No existe una contraseña predeterminada.

## Persistencia

El servidor crea `DATA_DIR` si no existe. En local usa `./data`. En hosting, configura `DATA_DIR` como punto de montaje de almacenamiento persistente. Si el sistema de archivos del proveedor es efímero, el catálogo se puede reconstruir desde Suno, pero las entradas manuales se perderán al reiniciar o desplegar.

## PWA y modo sin conexión

El manifiesto y el service worker permiten instalar la interfaz cuando el navegador cumple las condiciones de instalación. El service worker almacena el shell de la web y no intercepta las rutas `/api/*`.

El catálogo y la sincronización necesitan conexión. La caché PWA no implica que la música o las publicaciones de Suno estén disponibles offline.

## Integración de Suno

La ruta consultada en `server/index.js` pertenece a una integración no oficial y puede cambiar sin previo aviso. Si deja de responder, se conserva el último catálogo guardado y se pueden mantener enlaces públicos manualmente. No se accede a contenido privado ni Link Only.
