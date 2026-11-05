# Sonory Lab — documentación de la plataforma

## Qué es

Sonory Lab es una web musical estática diseñada para GitHub Pages. Incluye una biblioteca de audio detectada desde el repositorio, un reproductor, favoritos, búsqueda, reproducción aleatoria, ambiente musical opcional, efectos sonoros y soporte PWA.

## Estructura del repositorio

```text
├── assets/
│   ├── css/
│   │   └── app.css
│   ├── js/
│   │   └── app.js
│   ├── app-icon.svg
│   └── sonory-logo.svg
├── docs/
│   └── PLATFORM.md
├── music/
├── index.html
├── manifest.webmanifest
├── sw.js
├── README.md
└── SECURITY.md
```

## Añadir canciones

1. Abre la carpeta **`music/`** en GitHub.
2. Sube allí tus canciones. También puedes crear subcarpetas, por ejemplo `music/ambient/` o `music/singles/`.
3. Usa nombres de archivo descriptivos; el nombre se convierte en el título visible.
4. Recarga la plataforma. La biblioteca consulta el árbol del repositorio y detecta automáticamente los nuevos archivos.

Formatos detectados: MP3, WAV, OGG, OGA, OPUS, M4A, AAC, FLAC, MP4 y WEBM. La reproducción concreta depende de los códecs admitidos por el navegador.

**Importante:** solo se cargan archivos que estén dentro de `music/`. README, imágenes y otros archivos se ignoran. Los archivos deben estar disponibles públicamente para que GitHub Pages pueda reproducirlos.

## Reproductor y biblioteca

- **Buscar:** filtra por nombre de canción o ruta de carpeta.
- **Favoritas:** el corazón guarda preferencias en el almacenamiento local del navegador.
- **Ordenar:** permite ordenar alfabéticamente o por ruta.
- **Reproducción aleatoria:** el botón principal elige una pista al azar.
- **Controles:** reproducir/pausar, anterior/siguiente, progreso y volumen.
- **Teclado:** barra espaciadora reproduce/pausa; flechas izquierda/derecha retroceden o avanzan 10 segundos; la tecla M activa o desactiva el ambiente.
- **Media Session:** cuando el navegador lo admite, expone título y controles en la interfaz multimedia del dispositivo.

## Música ambiental

La opción **Ambiente** reproduce aleatoriamente canciones de la misma carpeta `music/`, sin repetir la pista anterior cuando hay más de una disponible. El nivel está limitado a aproximadamente el 4% del volumen normal. Para evitar reproducción inesperada, el usuario debe activarla manualmente; los navegadores no permiten garantizar autoplay con sonido antes de una interacción.

Al seleccionar una canción de la biblioteca, el reproductor cambia a reproducción normal y desactiva el modo ambiente.

## Efectos sonoros

La opción **Efectos** activa pequeños tonos de interfaz sintetizados con Web Audio. Está desactivada inicialmente y puede cambiarse en cualquier momento. No se descargan bibliotecas de efectos ni se reproducen sonidos externos.

## PWA e instalación

La plataforma incluye `manifest.webmanifest` y `sw.js`. Debe servirse mediante HTTPS (GitHub Pages y el dominio personalizado lo proporcionan habitualmente). En navegadores compatibles aparece **Instalar app** cuando el navegador considera que se cumplen sus condiciones de instalación.

El service worker almacena la interfaz, la portada SVG y el icono cuadrado para abrir la aplicación sin conexión. Los archivos de audio se guardan en caché cuando se solicitan; para reproducirlos offline, cada pista debe haberse cargado al menos una vez mientras había conexión. La biblioteca se conserva localmente como respaldo si la API de GitHub no está disponible.

## Seguridad y protección de contenidos

La interfaz incorpora una política CSP mediante meta tag, limita conexiones a GitHub API y raw.githubusercontent.com, bloquea objetos incrustados, fija la política de referencia, desactiva permisos de cámara/micrófono/geolocalización y valida las pistas recuperadas de caché. Los enlaces externos usan `noopener noreferrer`. La UI añade disuasión básica frente a menú contextual, arrastre y algunos atajos de guardar/imprimir/ver código.

**Límite importante:** esta web es estática y sus archivos se publican desde un repositorio GitHub Pages. Si el repositorio y los audios son públicos, una persona puede obtener el HTML, CSS, JavaScript y las URL de audio mediante herramientas del navegador, peticiones HTTP o GitHub. Deshabilitar clic derecho o atajos no impide capturas, grabación de audio, inspección, descargas técnicas ni copias. Tampoco existe DRM ni protección real de archivos en una web estática.

Para proteger de verdad el audio original y el código privado se necesita cambiar la arquitectura: mantener el repositorio privado, servir audio mediante un backend autenticado con URLs firmadas y caducables, aplicar límites de acceso y, si la licencia lo permite, un sistema DRM compatible con navegadores. El código entregado al navegador siempre puede inspeccionarse. GitHub Pages por sí solo no proporciona autenticación de usuarios ni control de acceso a archivos individuales.

## Privacidad y almacenamiento local

No se necesita cuenta ni se envían favoritos o ajustes a un servidor. La lista de favoritas, las preferencias de efectos y el volumen se guardan en el almacenamiento local del dispositivo. La lista de canciones también se conserva como caché local de metadatos.

## Actualizaciones y mantenimiento

- Añadir canciones no requiere editar código.
- Cambios de diseño se realizan en `index.html`.
- Portada y marca: sustituir `assets/sonory-logo.svg` para actualizar la pantalla de bienvenida, la portada y la cabecera. El icono cuadrado `assets/app-icon.svg` se usa como favicon y en el manifiesto PWA.
- Configuración PWA: `manifest.webmanifest` y `sw.js`.
- Tras publicar una actualización, el navegador puede conservar recursos de caché; cerrar y volver a abrir la app o recargarla permite obtener la versión más reciente.

## Solución de problemas

**No aparecen canciones:** comprueba que el archivo está en `music/`, que el formato está en la lista admitida y que el repositorio es público.

**La canción aparece pero no reproduce:** prueba otro formato (MP3 es una opción ampliamente compatible), comprueba que el archivo se haya subido completo y que el navegador permita ese códec.

**No aparece Instalar app:** verifica HTTPS, manifest y service worker, y usa el menú del navegador si la instalación manual está disponible. La interfaz de instalación varía según navegador y dispositivo.

**El ambiente no comienza:** activa Ambiente con el botón de la plataforma después de entrar. Los navegadores bloquean la reproducción automática con sonido hasta que exista una interacción del usuario.

**La música no está disponible sin conexión:** cada audio se almacena al escucharse con conexión. La primera carga de una pista requiere internet.
