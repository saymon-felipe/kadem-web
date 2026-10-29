import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { clientsClaim } from "workbox-core";
import { backgroundPull, BACKGROUND_TAG } from "./services/backgroundSync";
import { db } from "./db";

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html"), { denylist: [/^\/api(?:\/|$)/] }));
registerRoute(
  ({ url }) => url.pathname.endsWith("/api/system"),
  new NetworkFirst({
    cacheName: "api-system-cache",
    plugins: [new ExpirationPlugin({ maxEntries: 1, maxAgeSeconds: 86400 })],
  }),
);
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "runtime-images-cache",
    plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 2592000 })],
  }),
);
async function synchronize() {
  const clients = await self.clients.matchAll({ type: "window" });
  if (clients.length) {
    clients[0].postMessage({ type: BACKGROUND_TAG });
    return;
  }
  if (self.navigator.locks) await self.navigator.locks.request("kadem-background", backgroundPull);
  else await backgroundPull();
}
self.addEventListener("sync", (event) => {
  if (event.tag === BACKGROUND_TAG) event.waitUntil(synchronize());
});
self.addEventListener("periodicsync", (event) => {
  if (event.tag === BACKGROUND_TAG) event.waitUntil(synchronize());
});
self.addEventListener("push", (event) =>
  event.waitUntil(
    (async () => {
      let payload;
      try {
        payload = event.data.json();
      } catch {
        return;
      }
      const config = await db.background_settings.get("current");
      if (!config?.enabled || String(config.user_id) !== String(payload.user_id)) return;
      await self.registration.showNotification(payload.title || "Kadem", {
        body: payload.body,
        tag: `kadem-${payload.id}`,
        icon: "/kadem-icon.png",
        data: { module: payload.module, id: payload.id },
      });
      if (config.background_sync) await synchronize().catch(() => {});
    })(),
  ),
);
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = new URL("/", self.location.origin);
      url.searchParams.set("notification", event.notification.data?.module === "health" ? "health" : "nexo");
      const clients = await self.clients.matchAll({ type: "window" });
      if (clients.length) {
        await clients[0].focus();
        clients[0].postMessage({ type: "kadem-open-notification", module: event.notification.data?.module });
      } else await self.clients.openWindow(url.href);
    })(),
  );
});
