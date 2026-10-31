// Change this version number (e.g., 'dreadmoor-v2') whenever you push an update to GitHub
const CACHE_NAME = 'dreadmoor-v28';

// Add the exact paths of the core files you want available offline
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192-v2.svg'
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

// 3. Intercept Network Requests (The actual offline magic)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return cached file if found, otherwise go to the network
            return cachedResponse || fetch(event.request);
        })
    );
});
