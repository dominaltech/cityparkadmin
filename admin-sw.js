/* ═══════════════════════════════════════════════════════════════════
   Hotel City Park — Admin Service Worker (PWA)
   Handles: Push Notifications · Offline Cache · Notification Clicks
═══════════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'citypark-admin-v3';
const CACHE_ASSETS = [
  './index.html',
  './inquiries.html',
  './booked_rooms.html',
  './conference.html',
  './messages.html',
  './rooms.html',
  './gallery.html',
  './banquets.html',
  './logo.png',
  './app-icon.png',
  './admin-manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        const url = new URL(event.request.url);
        const filename = url.pathname.split('/').pop() || 'index.html';
        return caches.match('./' + filename).then(res => res || caches.match('./index.html'));
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});

self.addEventListener('push', event => {
  let data = {
    title: 'New Inquiry — Hotel City Park',
    body:  'A new booking enquiry has been received.',
    type:  'contact',
    icon:  '/user/logo.png',
  };
  try { Object.assign(data, event.data.json()); } catch (_) {}

  const notifOptions = {
    body:               data.body,
    icon:               data.icon,
    badge:              data.icon,
    tag:                'new-inquiry',
    requireInteraction: true,
    vibrate:            [300, 100, 300, 100, 600],
    timestamp:          Date.now(),
    data:               { url: self.registration.scope, type: data.type },
    actions: [
      { action: 'view',    title: 'View in Admin' },
      { action: 'dismiss', title: 'Dismiss'       },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, notifOptions),
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => clients.forEach(c => c.postMessage({ type: 'PLAY_SOUND' }))),
    ])
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const adminScope = self.registration.scope;
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Find any open admin tab
        const adminTab = clients.find(c => c.url.startsWith(adminScope));
        if (adminTab) return adminTab.focus();
        // Open admin panel (use scope which resolves to index.html)
        return self.clients.openWindow(adminScope);
      })
  );
});
