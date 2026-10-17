import { expect, test } from "@playwright/test";

test("service worker retires private report caching and retains app assets", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__seedOldCache", {
      value: Promise.all([
        caches
          .open("gtcd-api")
          .then((cache) =>
            cache.put("/api/stats/browsers/1", new Response("old private data"))
          ),
        caches
          .open("unrelated-cache")
          .then((cache) => cache.put("/unrelated", new Response("keep"))),
      ]),
    });
  });
  await page.goto("/login");
  await page.evaluate(async () => {
    await Reflect.get(window, "__seedOldCache");
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => caches.has("gtcd-api")))
    .toBe(false);
  expect(await page.evaluate(() => caches.has("unrelated-cache"))).toBe(true);
  expect(
    await page.evaluate(async () =>
      (await caches.keys()).some((key) => key.startsWith("workbox-precache"))
    )
  ).toBe(true);
  expect((await page.request.get("/api/stats/browsers/1")).status()).toBe(401);

  // A cold nested URL must register the root worker, not /dashboard/sw.js.
  await page.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations())
      await registration.unregister();
  });
  await page.goto("/share/invalid");
  const workerUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL;
  });
  expect(workerUrl).toBe(new URL("/sw.js", page.url()).href);
});
