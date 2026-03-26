// StayMate Service Worker — Push Notifications + Offline Shell

const CACHE_NAME = "staymate-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification received
self.addEventListener("push", (event) => {
  let data = { title: "StayMate", body: "You have a new update." };
  try {
    data = event.data ? event.data.json() : data;
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title ?? "StayMate", {
      body: data.body ?? "",
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: { url: data.url ?? "/" },
      vibrate: [200, 100, 200],
    })
  );
});

// ── Image cache (cache-first for Supabase storage images) ──
const IMG_CACHE = "staymate-images-v1";
const MAX_IMG_ENTRIES = 300;

self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  // Only cache Supabase storage image requests (both /object/ and /render/)
  if (
    event.request.method === "GET" &&
    url.includes("supabase.co/storage/v1/") &&
    (url.includes("/object/public/") || url.includes("/render/image/public/"))
  ) {
    event.respondWith(
      caches.open(IMG_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
              // Evict old entries if cache is too large
              cache.keys().then((keys) => {
                if (keys.length > MAX_IMG_ENTRIES) {
                  for (let i = 0; i < keys.length - MAX_IMG_ENTRIES; i++) {
                    cache.delete(keys[i]);
                  }
                }
              });
            }
            return response;
          });
        })
      )
    );
    return;
  }
});

// Tap on notification → open app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
