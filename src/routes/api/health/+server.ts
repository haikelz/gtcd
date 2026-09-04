import { pingRedis } from "$lib/server/auth/session-store.js";
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
  const isRedisUp = await pingRedis();
  health.redis = isRedisUp ? "connected" : "disconnected";

  if (!isRedisUp && health.status === "healthy") {
    // Redis offline but memory fallback active: degraded
    health.status = "degraded";
  }

  const statusCode =
    health.goatcounter === "connected" ? 200 : 503;

  return json(health, { status: statusCode });
};
