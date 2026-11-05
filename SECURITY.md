# Seguridad de Sonory Lab

## Reportar vulnerabilidades

No publiques credenciales, tokens, datos personales ni detalles explotables en incidencias públicas. Contacta al mantenedor del repositorio por un canal privado.

## Controles actuales

- Content Security Policy declarada en el documento HTML.
- Scripts y estilos locales separados del HTML.
- Sin dependencias JavaScript de terceros.
- Enlaces externos con `noopener noreferrer`.
- Validación de las entradas de biblioteca recuperadas desde caché local.
- Caché offline limitada a la interfaz y los audios bajo `music/`.
- Permisos de cámara, micrófono y geolocalización deshabilitados.
- Disuasión superficial de clic derecho, arrastre y algunos atajos de teclado.

## Límites

Sonory Lab se publica como web estática. La protección de interfaz no puede impedir que visitantes inspeccionen o guarden los recursos que el navegador debe descargar para mostrarlos y reproducirlos. Los audios públicos en GitHub pueden descargarse directamente. No se debe almacenar ningún secreto, token privado o material que requiera control de acceso en este repositorio público.

Para protección real de audio: repositorio privado, API/backend autenticado, autorización por usuario, URLs de medios firmadas con caducidad, rate limiting y DRM cuando corresponda. GitHub Pages no proporciona estas capacidades.
