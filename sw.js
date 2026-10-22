/* 粉猪账本 · 极简离线缓存
   页面导航走「网络优先」，静态资源走「缓存优先」。
   缓存与回退路径都用相对 scope，既能部署在根域名，也能放在 GitHub Pages 子路径下。
   升级部署后如需强制刷新缓存，把 CACHE_VERSION 改一下即可。 */
const CACHE_VERSION = 'pink-piggy-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_VERSION);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cache = await caches.open(CACHE_VERSION);
          const fallbackUrl = new URL('index.html', self.registration.scope).href;
          return (
            (await cache.match(request)) ||
            (await cache.match(fallbackUrl)) ||
            (await cache.match(self.registration.scope)) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        return Response.error();
      }
    })(),
  );
});
