// CoToom service worker — Web Push + PWA installability

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Minimal fetch handler (network passthrough) — required for PWA install prompts
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Thông báo mới từ CoToom'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [500, 200, 500, 200, 500],
    tag: data.tag || undefined,
    renotify: true,
    requireInteraction: true, // Keep notification visible on lock screen / notification center until user interacts
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Focus an existing app window if one is open, otherwise open a new one
      for (const client of windows) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
