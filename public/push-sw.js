self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: event.data.text() };
    }
  }

  const title = data.title || '今日新词出炉';
  const options = {
    body: data.body || '快来看看今天的精美短文与单词吧！',
    icon: '/pwa-192x192.png',
    data: data.url || '/'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data || '/');
      }
    })
  );
});
