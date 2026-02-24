const CACHE_NAME = 'filalab-pwa-cache-v1';
const urlsToCache = [
    '/',
    '/meu-lugar',
    '/manifest.json',
    '/vite.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
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
