# NEXO Marketing Workspace

Aplicación independiente para planificar, programar y distribuir campañas en WhatsApp Business, Telegram, Facebook Pages, Instagram profesional y Messenger.

> El módulo vive en `marketing/` y no reemplaza el sitio musical de Sonory Lab. Se ejecuta como un servicio Node.js independiente.

## Funciones

- Panel privado con contraseña y sesión HttpOnly.
- Creación de campañas, borradores y calendario.
- Programador integrado que ejecuta campañas vencidas mientras el servicio está activo.
- Publicación en Facebook Pages, Instagram profesional y canales/grupos de Telegram.
- Mensajes con plantilla aprobada para WhatsApp Business y mensajes a destinatarios elegibles de Messenger.
- Resultado independiente por red y estados de publicación parcial o fallida.
- PWA instalable y datos persistidos en JSON.

## Requisitos e instalación

Node.js 18.18 o superior. Desde la raíz del repositorio:

```bash
cd marketing
npm install
cp .env.example .env
```

Configura al menos `ADMIN_PASSWORD` en `.env`, después ejecuta:

```bash
npm start
```

Abre `http://localhost:3100`. Para desarrollo: `npm run dev`.

## Despliegue

Despliega `marketing/` como un servicio Node.js independiente y define esa carpeta como Root Directory. Comando de inicio: `npm start`. Usa un volumen/disco persistente y asigna su ruta a `DATA_DIR`.

El programador JSON está diseñado para una sola instancia del proceso. Si el servicio está detenido, los trabajos vencidos se procesan cuando vuelva a arrancar. Para múltiples instancias o alto volumen, migra la cola a una base de datos y un worker distribuido.

## Seguridad

No subas tokens ni contraseñas al repositorio. Guarda secretos en las variables del hosting, usa HTTPS en producción, asigna los permisos mínimos y respalda el almacenamiento. El panel utiliza una contraseña única, sesión HttpOnly/SameSite y limitación básica de intentos de acceso.

## Configuración de redes

Consulta [docs/CONEXIONES.md](docs/CONEXIONES.md) para variables, permisos y límites.

## Alcance del MVP

La versión conecta los adaptadores de publicación y mensajes descritos. Los informes de alcance/impresiones y la bandeja unificada de conversaciones no están conectados todavía; el panel presenta estados devueltos por las APIs, no métricas inventadas.
