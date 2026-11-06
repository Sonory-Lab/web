# Política de seguridad — Sonory Lab

## Alcance

Sonory Lab es una aplicación Node.js + Express. El panel administrativo debe publicarse únicamente mediante HTTPS y protegerse con una contraseña larga, única y secreta.

## Controles implementados

- Cabeceras HTTP: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` y Content Security Policy.
- `X-Powered-By` deshabilitado.
- Cuerpo JSON limitado a 48 KB.
- Validación de enlaces manuales: solo URL `https://suno.com/song/...`.
- Comparación de contraseña en tiempo constante.
- Cookie de sesión `HttpOnly` y `SameSite=Strict`; atributo `Secure` en producción.
- Token aleatorio con caducidad de ocho horas.
- Protección de origen para operaciones de escritura del panel.
- Límite de diez intentos de inicio de sesión por IP en una ventana de quince minutos.
- Directorio de datos y archivo `.env` excluidos de Git.
- Sin CORS abierto para orígenes arbitrarios.

## Configuración segura

- Guarda `ADMIN_PASSWORD` como secreto en el proveedor de hosting, nunca en Git.
- Utiliza HTTPS y activa `NODE_ENV=production`.
- Configura `TRUST_PROXY=true` únicamente detrás de un proxy inverso de confianza.
- Usa almacenamiento persistente para `DATA_DIR` si necesitas conservar las entradas manuales entre despliegues.
- Mantén Node.js y las dependencias actualizados.

## Límites conocidos

- Los contadores de intentos y las sesiones viven en memoria del proceso. Reiniciar el servidor los reinicia; con varias instancias cada una mantiene su propio estado.
- El panel no incluye MFA ni gestión de múltiples usuarios.
- La integración de Suno es no oficial y su disponibilidad puede cambiar.
- Los recursos servidos al navegador pueden inspeccionarse y las URL públicas siguen siendo accesibles conforme a las reglas de la plataforma de origen.
- No hay DRM; no es posible garantizar que el material público no se copie, grabe o descargue.

## Reporte responsable

No publiques contraseñas, cookies, tokens ni datos privados en incidencias públicas. Comparte pasos de reproducción e impacto sin incluir secretos.
