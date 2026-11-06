# Configuración de los canales

NEXO utiliza las APIs oficiales y credenciales almacenadas en el servidor. No automatiza inicios de sesión de navegador ni utiliza contraseñas personales de redes sociales.

## Facebook Pages
Crea una aplicación en Meta for Developers, autoriza una Página que administras y guarda el Page Access Token en `META_ACCESS_TOKEN` y su ID en `META_PAGE_ID`. Solicita los permisos de Pages aplicables, normalmente `pages_show_list` y `pages_manage_posts`. La API publica en Páginas, no en perfiles personales.

## Instagram
Usa una cuenta profesional (Business o Creator) habilitada para publicación. Para este adaptador con Facebook Login, vincula la cuenta a una Página compatible. Configura `META_ACCESS_TOKEN` e `INSTAGRAM_USER_ID` y solicita `instagram_content_publish` y los permisos básicos que requiera tu flujo. Esta versión publica imágenes individuales con caption; el archivo debe tener una URL HTTPS pública. Reels, Stories y carruseles quedan fuera de este primer adaptador.

## WhatsApp Business Platform
Configura Cloud API, el número de empresa y los permisos `whatsapp_business_messaging` y `whatsapp_business_management` que correspondan. Guarda `WA_ACCESS_TOKEN`, `WA_PHONE_NUMBER_ID` y, opcionalmente, `WA_TEMPLATE_NAME`. Los envíos de campañas utilizan plantillas aprobadas por WhatsApp Manager; el nombre, idioma y variables deben coincidir exactamente. Introduce teléfonos E.164 y envía únicamente a usuarios que dieron consentimiento. El MVP bloquea plantillas de marketing para números +1 debido a las restricciones de Meta; comprueba siempre la política actual antes de activar envíos. WhatsApp es mensajería directa, no un feed público.

## Telegram
Crea un bot con `@BotFather`, añádelo al canal/grupo de destino y concédele permisos de publicación. Configura `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` (ID de chat o @username de canal público). Un bot no puede iniciar por sí solo un chat privado con una persona que nunca lo haya iniciado.

## Messenger
Conecta una Página a una aplicación Meta, genera un Page Access Token y configura `MESSENGER_PAGE_ACCESS_TOKEN`. Opcionalmente configura `MESSENGER_DEFAULT_RECIPIENT` con un PSID. Solicita `pages_messaging` y completa los requisitos de revisión/acceso de Meta. El MVP envía mensajes tipo RESPONSE y exige confirmar que el destinatario está dentro de la ventana de mensajería permitida.

## Variables de entorno principales

| Variable | Uso |
|---|---|
| `ADMIN_PASSWORD` | Contraseña del panel |
| `DATA_DIR` | Almacenamiento persistente |
| `META_GRAPH_VERSION` | Versión de Graph API |
| `META_ACCESS_TOKEN` | Token de Página/Instagram |
| `META_PAGE_ID` | ID de Página Facebook |
| `INSTAGRAM_USER_ID` | ID de cuenta profesional |
| `WA_ACCESS_TOKEN` | Token WhatsApp Cloud API |
| `WA_PHONE_NUMBER_ID` | ID del número WhatsApp Business |
| `WA_TEMPLATE_NAME` | Plantilla aprobada por defecto |
| `TELEGRAM_BOT_TOKEN` | Token bot Telegram |
| `TELEGRAM_CHAT_ID` | Canal/grupo destino |
| `MESSENGER_PAGE_ACCESS_TOKEN` | Token de Página Messenger |
| `MESSENGER_DEFAULT_RECIPIENT` | PSID predeterminado |

## Operación y límites

Las plataformas pueden exigir revisión de aplicación, modo Live, permisos avanzados, verificación de empresa, renovación de tokens y límites de uso. Un error de un canal no oculta los resultados de otros canales. La programación depende de que el servicio esté ejecutándose. El motor usa la hora del servidor: confirma su zona horaria al desplegar.

NEXO no administra la validez legal del consentimiento ni sincroniza las bajas. Valida la fuente del consentimiento, respeta las exclusiones y la legislación aplicable antes de publicar. Las políticas de cada plataforma pueden cambiar.

## Referencias
- [Instagram API — Meta Postman](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)
- [WhatsApp Cloud API — Meta Postman](https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api)
- [Messenger Platform API — Meta Postman](https://www.postman.com/meta/messenger-platform-api/documentation/iyp204x/messenger-platform-api)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram bots introduction](https://core.telegram.org/bots)
- [AWS WhatsApp template and US +1 notes](https://docs.aws.amazon.com/end-user-messaging/latest/userguide/nx-features-whatsapp-templates.html)
