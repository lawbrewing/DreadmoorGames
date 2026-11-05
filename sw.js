// Bumped to v36 to force devices to clear the old v35 cache
const CACHE_NAME = 'dreadmoor-v38';

// Replaced the SVG with the new PNGs required by the manifest
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192-v2.png',
    './icon-512-v2.png'
];

// 1. Install & Cache
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force the waiting worker to become active immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching core assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. Clean Up Old Caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Take control of the page immediately
});

// 3. Intercept Network Requests (Network First, Fallback to Cache)
self.addEventListener('fetch', (event) => {
    // Ignore API calls to the Tailscale ledger so they are never cached accidentally
    if (event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            // If online and the fetch succeeds, update the cache with the newest version
            return caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
            });
        }).catch(() => {
            // If offline or the network fails, serve the cached fallback
            return caches.match(event.request);
        })
    );
});