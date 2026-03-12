// File: public/sw.js
// Service Worker — stale-while-revalidate for API, cache-first for pages, offline fallback

const CACHE_VERSION = 'witus-work-v1';
const STATIC_URLS = [
  '/offline.html',
];

// Install: pre-cache static pages
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_URLS))
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API routes: stale-while-revalidate
  // Return cached response immediately if available, update cache in background
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => {
            // Network failed — cached version is all we have
            return cached || new Response('{"error":"Offline"}', {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            });
          });

        // Return cache immediately if available, otherwise wait for network
        return cached || networkFetch;
      })
    );
    return;
  }

  // Navigation requests: network-first (always hit server, fall back to cache when offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Static assets (JS, CSS, images): cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => new Response('', { status: 503 }));
    })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const options = {
      body: payload.body || '',
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      tag: payload.tag || 'witus-work-notification',
      data: { url: payload.url || '/dashboard/contractor' },
      actions: [{ action: 'open', title: 'Open' }],
      vibrate: [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(payload.title || 'Work.WitUS', options)
    );
  } catch {
    // Fallback for non-JSON payloads
    event.waitUntil(
      self.registration.showNotification('Work.WitUS', {
        body: event.data.text(),
        icon: '/icon-192.png',
      })
    );
  }
});

// ── Client-side notification scheduling ─────────────────────────
// The main thread sends upcoming notifications; we schedule them with setTimeout.
const scheduledTimers = new Map(); // tag → timerId

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATIONS') {
    const notifications = event.data.notifications || [];

    // Clear any previously scheduled timers
    for (const [tag, timerId] of scheduledTimers) {
      clearTimeout(timerId);
      scheduledTimers.delete(tag);
    }

    const now = Date.now();
    for (const n of notifications) {
      const fireAt = new Date(n.scheduledAt).getTime();
      const delay = fireAt - now;
      if (delay <= 0 || delay > 48 * 60 * 60 * 1000) continue; // skip past or >48h

      const timerId = setTimeout(() => {
        self.registration.showNotification(n.title, {
          body: n.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: n.tag,
          data: { url: n.url || '/dashboard/contractor' },
          actions: [{ action: 'open', title: 'Open' }],
          vibrate: [200, 100, 200],
        });
        scheduledTimers.delete(n.tag);
      }, delay);

      scheduledTimers.set(n.tag, timerId);
    }
  }
});

// Notification click handler — navigate to the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard/contractor';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if one is open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new tab
      return self.clients.openWindow(url);
    })
  );
});
