import { pingRedis } from "$lib/server/auth/session-store.js";
import {
  getUpstreamStatus,
  refreshUpstreamStatus,
} from "$lib/server/goatcounter/client.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * Health endpoint for orchestrator probes and monitoring.
 *
 * It always answers 200 as long as this process can serve: GoatCounter and
 * Redis outages degrade the dashboard gracefully (error states, in-memory
 * session fallback), so they must not fail liveness or restart healthy pods.
 * Dependency states are reported in the body as eventual status: a background
 * refresh updates GoatCounter reachability without ever blocking the probe,
 * and Redis is probed with a short-cooldown fast-fail while it is down.
 */
export const GET: RequestHandler = async () => {
  refreshUpstreamStatus();

  // Bounded probe: a health check must never block longer than the probe timeout.
  const isRedisUp = await pingRedis(400);
  const goatcounter = getUpstreamStatus();

  const degraded = isRedisUp === false || goatcounter === "down";

  return json(
    {
      status: degraded ? "degraded" : "healthy",
      goatcounter,
      redis: isRedisUp ? "connected" : "disconnected",
    },
    { status: 200 },
  );
};
