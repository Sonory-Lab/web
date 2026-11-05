const CACHE_VERSION = "sonory-lab-v1";
const APP_CACHE = CACHE_VERSION + "-app";
const MUSIC_CACHE = CACHE_VERSION + "-music";
const APP_FILES = ["./", "./index.html", "./manifest.webmanifest", "./assets/sonory-logo.svg", "./assets/app-icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(APP_CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => ![APP_CACHE, MUSIC_CACHE].includes(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function musicResponse(request) {
  const cache = await caches.open(MUSIC_CACHE);
  const range = request.headers.get("range");
  let fullResponse = await cache.match(request.url);

  // Si la primera petición viene con Range, descarga y guarda el archivo completo.
  if (!fullResponse) {
    const headers = new Headers(request.headers);
    headers.delete("range");
    const networkResponse = await fetch(request.url, { method: "GET", headers });
    if (!networkResponse.ok || networkResponse.status !== 200) return networkResponse;
    await cache.put(request.url, networkResponse.clone());
    fullResponse = networkResponse;
  }

  if (!range) return fullResponse;
  const match = /^bytes=(\d+)-(\d*)$/i.exec(range);
  if (!match) return fetch(request);

  const body = await fullResponse.arrayBuffer();
  const total = body.byteLength;
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : total - 1;
  if (start >= total || requestedEnd < start) {
    return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + total } });
  }
  const end = Math.min(requestedEnd, total - 1);
  const headers = new Headers(fullResponse.headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Range", "bytes " + start + "-" + end + "/" + total);
  headers.set("Content-Length", String(end - start + 1));
  return new Response(body.slice(start, end + 1), { status: 206, statusText: "Partial Content", headers });
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Canciones de /music/ con soporte de Range para reproducir y buscar offline.
  if (url.hostname === "raw.githubusercontent.com" &&
      url.pathname.includes("/music/")) {
    event.respondWith(musicResponse(request).catch(() => new Response("Audio no disponible sin conexión.", { status: 503, statusText: "Offline" })));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(APP_CACHE).then(cache => cache.put("./index.html", copy));
        return response;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(APP_CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});
