# Seguridad — Sonory Lab

## Controles

- CSP con hashes SHA-256 para el CSS y JavaScript inline exactos de `index.html`.
- `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` y `Cross-Origin-Opener-Policy`.
- Sin middleware estático que exponga la raíz completa: solo se sirven HTML, PWA e iconos permitidos.
- Cuerpo JSON limitado a 48 KB.
- Cookie de sesión HttpOnly/SameSite Strict y Secure en producción.
- Contraseña comparada en tiempo constante y sesión con caducidad.
- Protección de origen para escrituras del panel y límite de intentos de login.
- `.env` y JSON de ejecución excluidos del control de versiones.

## Administración segura

Configura `ADMIN_PASSWORD` como secreto del proveedor. No la guardes en el repositorio. Usa HTTPS y almacenamiento persistente privado para `DATA_DIR`.

## Límites

La interfaz HTML/CSS/JS se entrega al navegador y puede inspeccionarse. No hay DRM; no se puede impedir completamente la copia de recursos públicos. Las sesiones y límites de intentos viven en memoria del proceso y se restablecen al reiniciar. El panel no incluye MFA ni usuarios múltiples.

## Reporte

No incluyas contraseñas, cookies ni tokens en incidencias públicas. Comparte pasos de reproducción y el impacto sin revelar secretos.
