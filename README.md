# Sonory Lab

**Plataforma musical independiente** para explorar publicaciones públicas de Sonory Lab en Suno, consultar lanzamientos por estilo y escuchar las pistas cuando Suno ofrece una URL de audio reproducible.

Esta versión agrupa la **interfaz pública y el panel administrativo en un único documento HTML**: `public/index.html`. Los estilos y el JavaScript de ambas vistas están integrados dentro del HTML. El servidor Node.js sigue siendo necesario para la API, la sincronización con Suno y las operaciones protegidas del panel.

## Qué incluye

- Documento HTML único para el sitio público y `/admin`.
- Diseño responsive con navegación móvil, tarjetas por estilo y reproductor adaptable.
- Catálogo público consultado desde el servidor.
- Búsqueda, filtros y orden por título o fecha.
- Reproducción de audio cuando la fuente proporciona una URL compatible.
- Entradas manuales mediante el panel administrativo.
- Caché del último catálogo correcto.
- PWA con manifiesto y service worker independiente.
- Content Security Policy con hashes de los estilos y scripts inline.
- Cabeceras de seguridad, sesión administrativa, validación y límite de intentos.

## Vista previa local

Requisitos: Node.js **18.18 o superior** y npm.

```bash
npm install
cp .env.example .env
```

Define una contraseña larga y exclusiva en `ADMIN_PASSWORD` dentro de `.env`; después ejecuta:

```bash
npm start
```

Abre `http://localhost:3000`. El panel está en `http://localhost:3000/admin`.

## Estructura

```text
.
├── public/
│   ├── index.html          # Único documento de interfaz (CSS + JS inline)
│   ├── manifest.webmanifest
│   ├── sw.js
│   └── assets/
│       ├── sonory-logo.svg
│       └── app-icon.svg
├── server/
│   └── index.js            # API, Suno, administración y seguridad
├── scripts/
│   └── check-inline.js     # Validación de scripts inline
├── data/                   # Persistencia de ejecución; no se versiona
├── docs/
│   ├── PLATFORM.md
│   └── DEPLOYMENT.md
├── .github/workflows/ci.yml
├── .env.example
├── .gitignore
├── package.json
├── render.yaml
├── README.md
└── SECURITY.md
```

## Configuración

| Variable | Función | Valor inicial |
|---|---|---|
| `PORT` | Puerto HTTP | `3000` |
| `NODE_ENV` | Entorno | `development` |
| `SUNO_PROFILE_HANDLE` | Perfil público de Suno, sin `@` | `sonorylab` |
| `CACHE_TTL_SECONDS` | Tiempo mínimo entre sincronizaciones automáticas | `300` |
| `ADMIN_PASSWORD` | Contraseña del panel | Sin valor; debe configurarse |
| `DATA_DIR` | Directorio de JSON de ejecución | `./data` |
| `TRUST_PROXY` | Confianza en proxy inverso | `false` |

No subas `.env`, contraseñas, tokens ni JSON privados a GitHub.

## Cómo funciona el HTML único

- En `/` se muestra la experiencia musical.
- En `/admin` se muestra el panel, utilizando el mismo HTML y su vista administrativa integrada.
- El servidor calcula hashes SHA-256 de los bloques `<style>` y `<script>` y los autoriza en la política CSP. No habilita `unsafe-inline`.
- Los recursos de PWA (manifiesto, service worker e iconos) permanecen separados porque el navegador los solicita como archivos específicos.
- El servidor Node.js permanece separado porque el HTML no puede proteger secretos, persistir datos privados ni ejecutar las API de sincronización.

## Desarrollo y validación

```bash
npm run dev
npm run check
npm test
```

La comprobación valida la sintaxis de `server/index.js` y compila los scripts inline. `npm test` añade una prueba HTTP del documento único, `/admin`, los hashes CSP y la sesión administrativa.

## Catálogo y límites de Suno

El servidor consulta publicaciones que sean accesibles desde el perfil público de Suno. La integración utiliza una ruta no oficial y puede cambiar. Si no hay URL de audio reproducible, la tarjeta dirige a la publicación en Suno. No se accede a canciones privadas ni Link Only.

## Despliegue

Se necesita hosting que ejecute Node.js. GitHub Pages no ejecuta Express ni las rutas `/api/*`. El repositorio incluye `render.yaml` como punto de partida para Render.

Consulta [Despliegue](docs/DEPLOYMENT.md), [Documentación técnica](docs/PLATFORM.md) y [Seguridad](SECURITY.md).

## Perfiles oficiales

- [Suno — @sonorylab](https://suno.com/@sonorylab)
- [Spreaker — Sonory Lab](https://www.spreaker.com/user/sonory-lab--19430117)
