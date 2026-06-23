// Push notification event handler (imported by the main service worker)
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const title = data.title || '🌿 Bonsai Manager'
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.svg',
    image: data.image || undefined,
    badge: '/favicon.svg',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    tag: 'bonsai-treatment',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Handle notification click — open the app at the right page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If app is already open, focus it and navigate
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url)
    })
  )
})
