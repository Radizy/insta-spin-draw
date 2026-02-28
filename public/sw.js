const CACHE_NAME = 'filalab-pwa-cache-v2'; // Updated to v2 to force new installation
const urlsToCache = [
    '/',
    '/meu-lugar',
    '/manifest.json',
    '/vite.svg'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Force the waiting service worker to become the active service worker.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', event => {
    // Clean up old caches so we don't serve incredibly stale versions
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of all clients immediately
    );
});

self.addEventListener('fetch', event => {
    // For navigation requests (like getting the index.html), strictly use Network First
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // For other assets (js, css, images), use Stale-While-Revalidate or Cache-First
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    // Update cache in the background (stale-while-revalidate)
                    fetch(event.request).then(netResponse => {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, netResponse));
                    }).catch(() => { });
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('push', function (event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body,
                icon: '/vite.svg',
                vibrate: [100, 50, 100],
                data: {
                    dateOfArrival: Date.now(),
                    primaryKey: 1
                }
            };

            event.waitUntil(
                self.registration.showNotification(data.title, options)
            );
        } catch (e) {
            event.waitUntil(
                self.registration.showNotification("FilaLab", { body: event.data.text() })
            );
        }
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/meu-lugar')
    );
});
