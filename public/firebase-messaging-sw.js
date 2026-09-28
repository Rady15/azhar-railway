/* Firebase Messaging service worker.
 * Public Firebase config is fetched from the backend so no project values are hard-coded here.
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

(async () => {
  try {
    const response = await fetch('/api/firebase-public-config', { cache: 'no-store' });
    const config = await response.json();
    if (!config?.apiKey || !config?.projectId) return;
    firebase.initializeApp(config);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || 'إشعار جديد';
      self.registration.showNotification(title, {
        body: payload.notification?.body || '',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        dir: 'rtl',
        lang: 'ar',
        data: payload.data || {}
      });
    });
  } catch (error) {
    console.warn('[firebase-messaging-sw] initialization failed', error);
  }
})();

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
