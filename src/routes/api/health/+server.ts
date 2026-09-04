import { getRedis } from "$lib/server/auth/session-store.js";
import { getMe } from "$lib/server/goatcounter/stats.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  const health = {
    status: "healthy" as "healthy" | "degraded" | "unhealthy",
    goatcounter: "unknown" as "connected" | "disconnected",
    redis: "unknown" as "connected" | "disconnected",
  };

  // Check GoatCounter API
  try {
    await getMe();
    health.goatcounter = "connected";
  } catch {
    health.goatcounter = "disconnected";
    health.status = "degraded";
  }

  // Check Redis
  try {
    const client = getRedis();
    const pong = await client.ping();
    health.redis = pong === "PONG" ? "connected" : "disconnected";
  } catch {
    health.redis = "disconnected";
    health.status = "unhealthy";
  }

  const status =
    health.status === "healthy"
      ? 200
      : health.status === "degraded"
      ? 200
      : 503;

  return json(health, { status });
};
