"use client";

import {useEffect} from "react";

/**
 * This app does not use a service worker. If one is registered on this origin
 * (left over from another app), remove it and its caches, then reload once so the
 * page comes straight from the server. A session flag prevents reload loops.
 */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (!registrations.length) return;
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      try {
        if (sessionStorage.getItem("nd-sw-cleaned")) return;
        sessionStorage.setItem("nd-sw-cleaned", "1");
      } catch {
        return;
      }
      window.location.reload();
    })();
  }, []);
  return null;
}
