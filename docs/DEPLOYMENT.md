# Despliegue de Sonory Lab

## Requisito

La interfaz se entrega desde un único documento HTML, pero la plataforma completa depende de Node.js + Express para catálogo, sesión de administración, persistencia y API. GitHub Pages solo sirve archivos estáticos y no puede ejecutar estas funciones.

## Render

El repositorio contiene `render.yaml` como configuración inicial.

1. Conecta el repositorio `Sonory-Lab/web` en Render mediante Blueprint.
2. Comprueba que el servicio use Node y ejecute `npm install` y `npm start`.
3. Define `ADMIN_PASSWORD` como secreto de entorno en Render.
4. Despliega y verifica `/healthz`.
5. Abre `/` para la plataforma y `/admin` para el panel administrativo.

La plantilla no crea por sí sola un disco persistente. Para conservar las entradas manuales entre reinicios, añade almacenamiento persistente al proveedor y define `DATA_DIR` con la ruta del punto de montaje.

## Despliegue Node genérico

```bash
npm install
npm run check
npm start
```

Define `NODE_ENV=production`, `ADMIN_PASSWORD`, `SUNO_PROFILE_HANDLE=sonorylab` y, si corresponde, `DATA_DIR`. Sirve la aplicación con HTTPS detrás de un proxy de confianza. Activa `TRUST_PROXY=true` solo cuando el proxy gestione correctamente las cabeceras reenviadas.

## Verificación posterior

- `GET /` muestra el documento HTML con las vistas pública y administrativa integradas.
- `GET /admin` devuelve el mismo documento y añade la política noindex.
- `GET /api/catalog` devuelve las publicaciones y el estado de Suno.
- `GET /healthz` devuelve el estado del proceso.
- `npm run check` valida JavaScript del servidor y los scripts inline.

## PWA

La instalación se basa en `public/manifest.webmanifest` y `public/sw.js`. Requiere HTTPS en producción. El service worker cachea el HTML unificado, el manifiesto y los iconos; las rutas API permanecen online.
