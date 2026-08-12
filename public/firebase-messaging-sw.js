// Firebase Cloud Messaging Service Worker for background push notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase App in Service Worker context
firebase.initializeApp({
  projectId: "gen-lang-client-0575030818",
  appId: "1:859726671580:web:3e786450559f91afff0e19",
  apiKey: "AIzaSyBMPwAg0QVtDOiL6zGE9TaA972v7UO0gps",
  authDomain: "gen-lang-client-0575030818.firebaseapp.com",
  messagingSenderId: "859726671580",
  storageBucket: "gen-lang-client-0575030818.firebasestorage.app"
});

const messaging = firebase.messaging();

// Map notification types to specific Genova deep routes
function resolveRoute(payloadData) {
  if (!payloadData) return '/';
  if (payloadData.route) return payloadData.route;
  if (payloadData.actionUrl) return payloadData.actionUrl;

  const type = payloadData.type || payloadData.category;
  switch (type) {
    case 'hydration':
    case 'nutri':
      return '/scan';
    case 'sleep':
    case 'wearable':
    case 'vitals':
      return '/wearables';
    case 'wellness':
    case 'ai':
      return '/assistant';
    case 'emergency':
      return '/emergency';
    case 'reminders':
      return '/';
    default:
      return '/';
  }
}

// Handle background notifications when app tab is closed or minimized
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background FCM push payload:', payload);

  const title = payload.notification?.title || payload.data?.title || 'Genova Health Update';
  const body = payload.notification?.body || payload.data?.body || 'New health check-in available in Genova Health.';
  const destinationRoute = resolveRoute(payload.data);

  const options = {
    body,
    icon: '/logo.svg',
    badge: '/favicon.svg',
    tag: `genova-notif-${Date.now()}`,
    data: {
      route: destinationRoute,
      payloadData: payload.data || {}
    },
    actions: [
      { action: 'open_app', title: 'Open Genova' }
    ]
  };

  self.registration.showNotification(title, options);
});

// Handle push notification click and navigate to destination route
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = event.notification.data?.route || '/';
  const targetUrl = new URL(route, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
