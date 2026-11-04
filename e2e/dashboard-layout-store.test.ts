import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { testRedisUrl } from "./test-redis";

type Layout = { views: { name: string; query: string }[] };

function addView(name: string) {
  return (layout: Layout) => ({
    ...layout,
    views: [...layout.views, { name, query: "period=week" }],
  });
}

function viewNames(layout: Layout): string[] {
  return layout.views.map((view) => view.name).sort();
}

test("layout saves keep concurrent changes and unreadable storage never overwrites a layout", async () => {
  const previous = process.env.REDIS_URL;
  const email = `layout-${randomUUID()}@example.invalid`;
  const raced = `layout-${randomUUID()}@example.invalid`;
  const servers: ViteDevServer[] = [];

  // Each server reads REDIS_URL when its first Redis call connects.
  async function storeFor(redisUrl: string) {
    process.env.REDIS_URL = redisUrl;
    const server = await createServer({ server: { middlewareMode: true } });
    servers.push(server);
    const sessions = await server.ssrLoadModule(
      "/src/lib/server/auth/session-store.ts"
    );
    await sessions.pingRedis();
    return {
      layouts: await server.ssrLoadModule(
        "/src/lib/server/dashboard-layout-store.ts"
      ),
      sessions,
    };
  }

  try {
    const online = await storeFor(testRedisUrl());
    const offline = await storeFor("redis://127.0.0.1:1");
    let seeds = 0;
    const seed = async () => {
      seeds++;
      return {};
    };

    await online.layouts.getDashboardLayout(email, seed);
    await online.layouts.getDashboardLayout(email, seed);
    expect(seeds).toBe(1);

    // Unreadable storage renders defaults without importing or saving.
    const fallback = await offline.layouts.getDashboardLayout(email, seed);
    expect(fallback.views).toEqual([]);
    expect(seeds).toBe(1);
    await expect(
      offline.layouts.saveDashboardLayout(email, addView("Lost"))
    ).rejects.toThrow("Storage is unavailable");

    // Two tabs saving at once both keep their change.
    await Promise.all([
      online.layouts.saveDashboardLayout(email, addView("Weekly")),
      online.layouts.saveDashboardLayout(email, addView("Campaigns")),
    ]);
    expect(viewNames(await online.layouts.getDashboardLayout(email))).toEqual([
      "Campaigns",
      "Weekly",
    ]);

    // A save that lands while the first import runs wins over the import.
    const imported = await online.layouts.getDashboardLayout(
      raced,
      async () => {
        await online.layouts.saveDashboardLayout(raced, addView("Saved first"));
        return {};
      }
    );
    expect(viewNames(imported)).toEqual(["Saved first"]);
    expect(viewNames(await online.layouts.getDashboardLayout(raced))).toEqual([
      "Saved first",
    ]);
  } finally {
    for (const server of servers) {
      const sessions = await server.ssrLoadModule(
        "/src/lib/server/auth/session-store.ts"
      );
      if (sessions.getRedis().status === "ready") {
        await sessions
          .getRedis()
          .del(`dashboard-layout:${email}`, `dashboard-layout:${raced}`);
      }
      sessions.getRedis().disconnect();
      await server.close();
    }
    if (previous === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previous;
  }
});
