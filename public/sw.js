const CACHE_NAME = "tiara-dirut-pwa-v2";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Jangan pernah intercept endpoint sinkronisasi server, proxy API, atau modul HMR Vite dev
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.endsWith(".php") ||
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/") ||
    url.searchParams.has("t")
  ) {
    return;
  }

  // Navigasi SPA: Network-first dengan fallback ke shell index.html saat offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put("/", copy));
          return res;
        })
        .catch(async () => {
          const cached =
            (await caches.match(req)) ||
            (await caches.match("/")) ||
            (await caches.match("/index.html"));
          return cached || Response.error();
        })
    );
    return;
  }

  // Aset statis (/assets/*, ikon, manifest): Network-first dengan cache fallback offline
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || Response.error();
        })
    );
  }
});
