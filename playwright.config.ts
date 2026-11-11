import { defineConfig } from "@playwright/test";
import { testRedisUrl } from "./e2e/test-redis";

// Smoke tests run the production build against e2e/mock-goatcounter.mjs.
// Run `pnpm build` first. TEST_REDIS_URL must point at an isolated test Redis.
// Durable settings, delivery jobs and share grants never fall back to memory.
const APP_PORT = Number(process.env.TEST_APP_PORT ?? 4173);
const MOCK_PORT = Number(process.env.TEST_MOCK_PORT ?? 5187);

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: `http://127.0.0.1:${APP_PORT}` },
  // A GoatCounter 429 pauses every queued upstream request in the shared
  // server, so tests that cause one run after the rest instead of stalling
  // whatever runs beside them. Running one file runs the main project first;
  // --no-deps skips that, and the two can then interfere again.
  projects: [
    { name: "main", grepInvert: /@pauses-upstream/ },
    {
      name: "pauses-upstream",
      grep: /@pauses-upstream/,
      dependencies: ["main"],
    },
  ],
  webServer: [
    {
      // No `port`: Playwright would reject a port held by a stale mock before
      // the launcher could name it and say how to free it.
      command: "node e2e/start-mock-goatcounter.mjs",
      env: { MOCK_PORT: String(MOCK_PORT), STATS_DELAY_MS: "300" },
      wait: { stdout: /mock-goatcounter listening/ },
    },
    {
      command: "node build",
      env: {
        GOATCOUNTER_ADMIN_URL: `http://localhost:${MOCK_PORT}`,
        GOATCOUNTER_API_KEY: "e2e",
        GOATCOUNTER_URL: `http://127.0.0.1:${MOCK_PORT}`,
        ORIGIN: `http://127.0.0.1:${APP_PORT}`,
        PORT: String(APP_PORT),
        REDIS_URL: testRedisUrl(),
        SMTP_HOST: "127.0.0.1",
        SMTP_PORT: "1",
        SMTP_SECURE: "false",
        SMTP_FROM: "e2e@example.invalid",
        SMTP_USER: "",
        SMTP_PASSWORD: "",
        GTCD_ADMIN_EMAILS: "qa@example.com",
        // Lets notification tests reach a receiver on localhost; 127.0.0.1
        // and other private addresses stay refused.
        GTCD_ALLOWED_WEBHOOKS: "localhost",
      },
      port: APP_PORT,
    },
  ],
});
