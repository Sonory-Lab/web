# Sonory Lab

Plataforma musical adaptable con reproductor, biblioteca automática desde `music/`, favoritos, modo ambiente, efectos sonoros y soporte PWA.

## Comenzar

Añade tus archivos de audio dentro de `music/` (también se admiten subcarpetas) y abre la web. La biblioteca detecta los archivos compatibles automáticamente.

Lee la [documentación completa](docs/PLATFORM.md) para conocer formatos, controles, PWA, reproducción ambiental, uso sin conexión y solución de problemas.

## Estructura\n\n- `assets/css/app.css`: estilos y diseño adaptable.\n- `assets/js/app.js`: biblioteca, reproductor y controles.\n- `sw.js` y `manifest.webmanifest`: PWA y caché.\n- `docs/PLATFORM.md`: documentación funcional y límites de seguridad.\n\n## Seguridad\n\nSe aplican cabeceras CSP mediante meta tags, validación de datos, permisos mínimos y medidas disuasorias de copia. Al ser un sitio estático público, no es posible impedir por completo la descarga o copia de recursos; consulta la sección de seguridad de la documentación.\n\n## Identidad oficial

El recurso `assets/sonory-logo.svg` se utiliza en la portada, la pantalla de bienvenida y la cabecera. El icono cuadrado `assets/app-icon.svg` se utiliza como favicon y para la instalación PWA.
