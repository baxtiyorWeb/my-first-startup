importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Deep-link: open correct page when user taps push notification
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const data = event.notification.data || {};
  // OneSignal puts the target URL in data.url or launchURL
  const targetUrl =
    data.url ||
    data.launchURL ||
    (event.notification.actions && event.notification.actions[0]?.action) ||
    "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // If a tab with the site is already open, focus it and navigate
        const appOrigin = self.location.origin;
        const fullUrl = targetUrl.startsWith("http")
          ? targetUrl
          : appOrigin + targetUrl;

        for (const client of clientList) {
          if (client.url.startsWith(appOrigin) && "focus" in client) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(fullUrl);
            }
            return;
          }
        }
        // No tab open — open a new one
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});
