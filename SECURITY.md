# Política de seguridad — Sonory Lab

## Controles de servidor

- Cabeceras CSP con hashes SHA-256 para el CSS y JavaScript inline exactos del documento.
- Sin `unsafe-inline` en las directivas de scripts y estilos.
- `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` y `Cross-Origin-Opener-Policy`.
- Cabecera `X-Powered-By` deshabilitada.
- Cuerpo JSON limitado a 48 KB.
- Sesiones aleatorias con cookie HttpOnly y SameSite Strict; Secure en producción.
- Contraseña comparada en tiempo constante, caducidad de sesión y límite de intentos de inicio de sesión.
- Validación de enlaces manuales y protección de origen para operaciones administrativas.
- `.env` y datos de ejecución excluidos del repositorio.

## Seguridad del documento único

La CSP permite los bloques inline únicamente si coinciden con los hashes del HTML que el servidor leyó al arrancar. Si se modifica un bloque inline, hay que reiniciar o desplegar para recalcular los hashes. La interfaz no usa manejadores inline de eventos ni carga scripts frontend externos.

## Configuración

- Define `ADMIN_PASSWORD` como secreto del proveedor, nunca en Git.
- Utiliza HTTPS y `NODE_ENV=production`.
- Activa `TRUST_PROXY=true` únicamente detrás de un proxy de confianza.
- Configura almacenamiento persistente si necesitas conservar los datos manuales.
- Mantén Node.js y dependencias actualizados.

## Límites

- La interfaz pública y su JavaScript/CSS deben enviarse al navegador y pueden inspeccionarse o copiarse.
- No existe DRM; los enlaces públicos de Suno continúan sujetos a la plataforma de origen.
- Las sesiones y el límite de intentos viven en memoria del proceso; un reinicio los restablece y múltiples instancias necesitan almacenamiento compartido para controles distribuidos.
- El panel no incluye MFA ni gestión de usuarios.

## Reporte responsable

No publiques contraseñas, cookies ni tokens en incidencias. Incluye pasos reproducibles e impacto sin compartir secretos.
