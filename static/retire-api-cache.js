// Remove only the retired analytics cache, not other apps' origin-wide caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.delete("gtcd-api"));
});
