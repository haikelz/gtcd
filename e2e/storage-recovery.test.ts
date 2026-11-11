import { randomInt, randomUUID } from "node:crypto";
import { connect, createServer as createProxy, type Socket } from "node:net";
import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { testRedisUrl } from "./test-redis";

test("durable mutations fail during outages and revoked grants stay revoked after recovery", async () => {
  test.setTimeout(45_000);
  const target = new URL(testRedisUrl());
  const previous = process.env.REDIS_URL;
  let available = true;
  const sockets = new Set<Socket>();
  const proxy = createProxy((client) => {
    if (!available) return client.destroy();
    const upstream = connect(Number(target.port || 6379), target.hostname);
    for (const socket of [client, upstream]) {
      sockets.add(socket);
      socket.on("error", () => {});
      socket.on("close", () => sockets.delete(socket));
    }
    client.pipe(upstream).pipe(client);
    client.on("close", () => upstream.destroy());
    upstream.on("close", () => client.destroy());
  });
  await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  const address = proxy.address();
  if (!address || typeof address === "string")
    throw new Error("Missing proxy port");
  const connection = new URL(target);
  connection.hostname = "127.0.0.1";
  connection.port = String(address.port);
  process.env.REDIS_URL = connection.toString();
  const first = await createServer({ server: { middlewareMode: true } });
  const second = await createServer({ server: { middlewareMode: true } });
  const siteId = randomInt(1_000_000, 9_999_999);
  const email = `recovery-${randomUUID()}@example.invalid`;
  try {
    const store = await first.ssrLoadModule("/src/lib/server/share-store.ts");
    const layouts = await first.ssrLoadModule(
      "/src/lib/server/dashboard-layout-store.ts"
    );
    const sessions = await first.ssrLoadModule(
      "/src/lib/server/auth/session-store.ts"
    );
    const annotations = await first.ssrLoadModule(
      "/src/lib/server/annotations.ts"
    );
    const note = { createdBy: email, date: "2026-10-05", text: "Before" };
    const saved = await annotations.addAnnotation(siteId, note);
    const original = await store.createShareLink(siteId);
    available = false;
    for (const socket of sockets) socket.destroy();
    await expect
      .poll(() => sessions.pingRedis(), { timeout: 10_000 })
      .toBe(false);
    await expect(store.revokeShareLink(siteId)).rejects.toThrow(
      "Storage is unavailable"
    );
    await expect(store.createShareLink(siteId)).rejects.toThrow(
      "Storage is unavailable"
    );
    await expect(layouts.saveDashboardLayout(email, {})).rejects.toThrow(
      "Storage is unavailable"
    );
    await expect(store.resolveShareToken(original.token)).rejects.toThrow(
      "Storage is unavailable"
    );
    await expect(annotations.listAnnotations(siteId)).rejects.toThrow(
      "Storage is unavailable"
    );
    await expect(
      annotations.addAnnotation(siteId, { ...note, text: "During" })
    ).rejects.toThrow("Storage is unavailable");
    await sessions.createSession(email, email);
    expect(await sessions.getSession(email)).toEqual({ email });

    available = true;
    await expect
      .poll(() => sessions.pingRedis(), { timeout: 25_000 })
      .toBe(true);
    expect(await store.resolveShareToken(original.token)).toBe(siteId);
    // No outage write survives in process memory.
    expect(await annotations.listAnnotations(siteId)).toEqual([saved]);
    await store.revokeShareLink(siteId);
    const replica = await second.ssrLoadModule(
      "/src/lib/server/share-store.ts"
    );
    expect(await replica.resolveShareToken(original.token)).toBeNull();
    expect(await replica.getShareLinks(siteId)).toEqual([]);
  } finally {
    for (const server of [first, second]) {
      const sessions = await server.ssrLoadModule(
        "/src/lib/server/auth/session-store.ts"
      );
      sessions.getRedis().disconnect();
      await server.close();
    }
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
    if (previous === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previous;
  }
});
