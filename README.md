# Sonory Lab

**Plataforma musical independiente** para explorar publicaciones públicas de Sonory Lab en Suno.

Los archivos principales de la web están directamente en la **raíz del repositorio**, no dentro de `public/` ni de otra carpeta:

- `index.html`: sitio público y panel administrativo en un solo documento, con CSS y JavaScript integrados.
- `server.js`: servidor Node.js, API, sincronización de Suno y seguridad.
- `manifest.webmanifest` y `sw.js`: instalación PWA y caché offline.
- `sonory-logo.svg` y `app-icon.svg`: identidad visual y favicon.
- `package.json`: comandos y dependencias.

## Empezar

Requisitos: Node.js 18.18+ y npm.

```bash
npm install
cp .env.example .env
```

Configura una contraseña segura en `ADMIN_PASSWORD` dentro de `.env` y ejecuta:

```bash
npm start
```

Visita `http://localhost:3000`. El panel privado se abre en `/admin`.

## Estructura visible del repositorio

```text
.
├── index.html
├── server.js
├── manifest.webmanifest
├── sw.js
├── sonory-logo.svg
├── app-icon.svg
├── package.json
├── render.yaml
├── .env.example
├── .gitignore
├── README.md
├── SECURITY.md
├── data/                    # datos runtime; excluidos de Git
├── docs/                    # documentación de apoyo
├── scripts/                 # comprobaciones automatizadas
└── .github/workflows/       # CI
```

## Funciones

- Catálogo público del perfil Suno y sincronización desde el servidor.
- Búsqueda, estilos, filtros y ordenación.
- Reproductor para audios disponibles desde la fuente.
- Entradas manuales de canciones mediante el panel `/admin`.
- Catálogo cacheado cuando Suno no responde.
- PWA instalable.
- Diseño adaptable a móvil, tableta y escritorio.
- CSP por hashes, sesión HttpOnly/SameSite, validación y limitación de intentos.

## Variables de entorno

| Variable | Función |
|---|---|
| `PORT` | Puerto del servidor (3000 por defecto) |
| `NODE_ENV` | Entorno de ejecución |
| `SUNO_PROFILE_HANDLE` | Handle público de Suno |
| `CACHE_TTL_SECONDS` | Caducidad de caché del catálogo |
| `ADMIN_PASSWORD` | Contraseña requerida para el panel |
| `DATA_DIR` | Carpeta persistente para datos JSON |
| `TRUST_PROXY` | Habilitar solo detrás de proxy de confianza |

No subas `.env`, credenciales ni datos privados a GitHub.

## Validación

```bash
npm run check
npm test
```

GitHub Actions ejecuta las comprobaciones en cada push y Pull Request a `main`.

## Publicación

La aplicación completa requiere hosting Node.js. GitHub Pages no ejecuta `server.js` ni sus API. El repositorio incluye `render.yaml` como configuración inicial para Render. Consulta [la guía de despliegue](docs/DEPLOYMENT.md).

## Perfiles oficiales

- [Suno — @sonorylab](https://suno.com/@sonorylab)
- [Spreaker — Sonory Lab](https://www.spreaker.com/user/sonory-lab--19430117)
