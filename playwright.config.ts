import { defineConfig } from "@playwright/test";

// Smoke tests run the production build against e2e/mock-goatcounter.mjs.
// Run `pnpm build` first. REDIS_URL points at a closed port so sessions use
// the in-memory fallback and never touch a real Redis.
const APP_PORT = 4173;
const MOCK_PORT = 5187;

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: `http://127.0.0.1:${APP_PORT}` },
  webServer: [
    {
      command: "node e2e/mock-goatcounter.mjs",
      env: { MOCK_PORT: String(MOCK_PORT), STATS_DELAY_MS: "300" },
      port: MOCK_PORT,
    },
    {
      command: "node build",
      env: {
        GOATCOUNTER_ADMIN_URL: `http://localhost:${MOCK_PORT}`,
        GOATCOUNTER_API_KEY: "e2e",
        GOATCOUNTER_URL: `http://127.0.0.1:${MOCK_PORT}`,
        ORIGIN: `http://127.0.0.1:${APP_PORT}`,
        PORT: String(APP_PORT),
        REDIS_URL: "redis://127.0.0.1:1",
        SMTP_HOST: "127.0.0.1",
        SMTP_PORT: "1",
        SMTP_SECURE: "false",
        SMTP_FROM: "e2e@example.invalid",
        SMTP_USER: "",
        SMTP_PASSWORD: "",
        GTCD_ADMIN_EMAILS: "qa@example.com",
      },
      port: APP_PORT,
    },
  ],
});
