/* eslint-disable no-restricted-globals */
/**
 * QLSS service worker — hand-rolled (no Workbox).
 *
 * Strategy overview:
 *   - install:    pre-cache the app shell
 *   - activate:   clear old caches, take control immediately
 *   - navigate:   network-first → cached "/" → cached "/offline"
 *   - same-origin static GET: stale-while-revalidate
 *   - /api/*:     network-only (never cached)
 *   - cross-origin / non-GET: passthrough (fetch, don't intercept)
 *
 * IMPORTANT: we never cache /_next/* paths here. Next.js dev HMR relies on
 * those URLs and caching them would break hot-reload. Static asset
 * optimization is left to the production CDN/Next itself.
 */

const CACHE = "qlss-v1";

// Pre-cached on install — the bare minimum needed to boot offline.
const PRECACHE_URLS = ["/", "/offline", "/manifest.json", "/logo.svg"];

// ─── Install: pre-cache the app shell ──────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // `addAll` is atomic — if any request fails, none are cached.
      // We use individual `put`s with `catch` so a single 404 doesn't
      // abort the whole pre-cache (e.g. /offline not yet built in dev).
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res && res.ok) {
              await cache.put(url, res.clone());
            }
          } catch {
            // ignore — will be cached lazily on next fetch
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

// ─── Activate: clear old caches & claim clients ────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// ─── Fetch: route by request type ──────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET — POST/PUT/etc. always go to the network.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin requests: never intercept (analytics, fonts, CDNs, …).
  if (url.origin !== self.location.origin) return;

  // API requests: network-only. Never cache, never fall back.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation requests (page loads): network-first → cached "/" → "/offline".
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          // Cache a copy of the latest HTML for next time.
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          // Network failed — try the exact URL, then "/", then "/offline".
          const cache = await caches.open(CACHE);
          const cachedExact = await cache.match(request);
          if (cachedExact) return cachedExact;
          const cachedRoot = await cache.match("/");
          if (cachedRoot) return cachedRoot;
          const offline = await cache.match("/offline");
          if (offline) return offline;
          // Last resort — a minimal fallback page so the SW never throws.
          return new Response(
            "<h1>Offline</h1><p>QLSS is offline and the cached page is unavailable.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      })()
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  // NOTE: we exclude /_next/* in dev to avoid breaking HMR — those URLs
  // change frequently and caching them would serve stale chunks. In
  // production Next fingerprints assets so SWR is safe, but we still skip
  // them to keep this SW small and let the browser/CDN handle them.
  if (url.pathname.startsWith("/_next/")) {
    // Passthrough — let the browser handle it normally.
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((fresh) => {
          // Only cache successful, basic (CORS-same-origin) responses.
          if (fresh && fresh.ok && fresh.type === "basic") {
            cache.put(request, fresh.clone()).catch(() => {});
          }
          return fresh;
        })
        .catch(() => undefined);

      if (cached) {
        // Serve stale, refresh in background.
        return cached;
      }
      const fresh = await fetchPromise;
      if (fresh) return fresh;
      // Nothing cached and network failed — return an empty response
      // (better than throwing, which would surface as a console error).
      return new Response("", { status: 504, statusText: "Offline" });
    })()
  );
});
