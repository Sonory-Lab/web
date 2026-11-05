const CACHE_VERSION = "sonory-lab-v1";
const APP_CACHE = CACHE_VERSION + "-app";
const MUSIC_CACHE = CACHE_VERSION + "-music";
const APP_FILES = ["./", "./index.html", "./manifest.webmanifest", "./assets/sonory-logo.svg"];

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

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Los archivos escuchados desde /music también quedan disponibles en caché para uso sin conexión.
  if (url.hostname === "raw.githubusercontent.com" &&
      url.pathname.includes("/music/")) {
    event.respondWith(
      caches.open(MUSIC_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) await cache.put(request, response.clone());
          return response;
        } catch (error) {
          return new Response("Audio no disponible sin conexión.", { status: 503, statusText: "Offline" });
        }
      })
    );
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
