// Geters.uz Service Worker - PWA & Web Push Notifications
const CACHE_NAME = "geters-cache-v1";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Background Web Push Notifications (Standard W3C Push API)
self.addEventListener("push", (event) => {
  let data = {
    title: "Geters.uz 🚀",
    message: "Sizda yangi bildirishnoma bor",
    url: "/dashboard/notifications",
    icon: "/logo.png",
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || payload.headings?.uz || payload.headings?.en || data.title,
        message: payload.message || payload.contents?.uz || payload.contents?.en || payload.body || data.message,
        url: payload.url || payload.link || data.url,
        icon: payload.icon || "/logo.png",
      };
    } catch {
      data.message = event.data.text() || data.message;
    }
  }

  const options = {
    body: data.message,
    icon: data.icon,
    badge: "/logo.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url,
    },
    actions: [
      { action: "open", title: "Ochish" },
      { action: "close", title: "Yopish" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle clicking on the notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const urlToOpen = event.notification.data?.url || "/dashboard/notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open with the url, focus it
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
