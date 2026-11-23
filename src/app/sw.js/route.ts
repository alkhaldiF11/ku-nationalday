/**
 * Service-worker "kill switch".
 *
 * This app does not use a service worker. A worker left over from another app on the
 * same origin (e.g. localhost:3000) keeps serving its cached, outdated files. Browsers
 * periodically re-fetch /sw.js to check for updates; a 404 leaves the old worker running,
 * so instead we serve a worker that clears every cache, unregisters itself and reloads
 * open pages so they load fresh from the network.
 */
const KILL_SWITCH = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({type: "window"});
    windows.forEach((client) => client.navigate(client.url));
  })());
});
`;

export function GET() {
  return new Response(KILL_SWITCH, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Service-Worker-Allowed": "/",
    },
  });
}
