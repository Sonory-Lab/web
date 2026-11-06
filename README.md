# Sonory Lab

**Plataforma musical independiente** para descubrir el catálogo público de Sonory Lab en Suno, escuchar pistas disponibles y mantener una selección manual desde un panel privado.

> Esta versión es una aplicación **Node.js + Express**. GitHub almacena el código; un servidor Node.js ejecuta la API y publica la web.

## Qué incluye

- Sitio público responsive con portada, catálogo musical y filtros por estilo.
- Sincronización del perfil público de Suno desde el servidor.
- Búsqueda por título/estilo y orden por fecha o título.
- Reproductor para las pistas cuya fuente entrega audio reproducible.
- Panel privado en `/admin` para añadir o quitar enlaces públicos de Suno.
- Caché del último catálogo válido si la fuente externa falla.
- PWA instalable con caché del shell de interfaz.
- Cabeceras de seguridad, validación de entradas, sesión HttpOnly/SameSite, protección de origen y límite de intentos de acceso.

## Vista previa local

```bash
npm install
cp .env.example .env
# Edita .env y define ADMIN_PASSWORD con una contraseña larga y exclusiva.
npm start
```

Abre `http://localhost:3000`. El panel de administración está en `http://localhost:3000/admin`.

## Requisitos

- Node.js **18.18 o superior**.
- npm.
- Conexión a Internet desde el servidor para consultar el perfil público de Suno.

## Configuración

| Variable | Función | Valor inicial |
|---|---|---|
| `PORT` | Puerto HTTP | `3000` |
| `NODE_ENV` | Modo de ejecución | `development` |
| `SUNO_PROFILE_HANDLE` | Handle público de Suno, sin `@` | `sonorylab` |
| `CACHE_TTL_SECONDS` | Tiempo mínimo entre sincronizaciones automáticas | `300` |
| `ADMIN_PASSWORD` | Contraseña del panel | Obligatoria para habilitar escrituras |
| `DATA_DIR` | Ubicación persistente de datos JSON | `./data` |
| `TRUST_PROXY` | Confianza en proxy inverso | `false` |

No subas `.env`, contraseñas ni datos privados al repositorio. El archivo `.env.example` no contiene secretos.

## Catálogo y fuente Suno

El servidor consulta publicaciones accesibles desde el perfil público. No intenta acceder a canciones privadas ni a publicaciones de tipo Link Only. La web muestra los datos que la fuente entrega (título, imagen, fecha, duración y, cuando está disponible, audio reproducible). Si no hay URL de audio, la ficha ofrece un enlace para escuchar en Suno.

La consulta usada por el servidor es una integración **no oficial**, no una API pública estable documentada por Suno. Puede cambiar o dejar de responder. En ese caso se conserva el último catálogo válido y se pueden mantener enlaces públicos manualmente desde el panel.

## Estructura del proyecto

```text
.
├── .github/\n│   └── workflows/ci.yml\n├── public/
│   ├── assets/
│   │   ├── app-icon.svg
│   │   └── sonory-logo.svg
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── admin.html
│   ├── admin.css
│   ├── admin.js
│   ├── manifest.webmanifest
│   └── sw.js
├── server/
│   └── index.js
├── data/                 # JSON runtime; ignorado por Git
├── docs/
│   ├── PLATFORM.md
│   └── DEPLOYMENT.md
├── .env.example
├── .gitignore
├── package.json
├── render.yaml
├── README.md
└── SECURITY.md
```

## Desarrollo

```bash
npm run dev
npm run check
```

`npm run check` valida la sintaxis de JavaScript del servidor, del sitio público y del panel.

## Integración continua

El workflow `.github/workflows/ci.yml` instala dependencias y ejecuta `npm run check` en cada push a `main` y en las Pull Requests dirigidas a `main`.

## Despliegue

La plataforma completa necesita un servicio que ejecute Node.js (Render, Railway, Fly.io o un VPS). **GitHub Pages no ejecuta Express ni las rutas `/api/*`**, por lo que no aloja esta versión funcional. El repositorio incluye `render.yaml` para facilitar el despliegue en Render.

Consulta [la guía de despliegue](docs/DEPLOYMENT.md) y [la documentación técnica](docs/PLATFORM.md).

## Perfiles oficiales

- [Suno — @sonorylab](https://suno.com/@sonorylab)
- [Spreaker — Sonory Lab](https://www.spreaker.com/user/sonory-lab--19430117)

## Seguridad

Consulta [SECURITY.md](SECURITY.md). La aplicación incorpora medidas de protección del servidor, pero los recursos y el código que se entregan al navegador pueden inspeccionarse. No hay DRM ni se puede garantizar que los recursos públicos no se copien.
