import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

// Separate ports and processes keep measurements isolated from the smoke stack.
const appPort = 4193;
const mockPort = 5197;

export default defineConfig({
  testDir: "e2e",
  testMatch: "performance.perf.ts",
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${appPort}`,
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "block",
  },
  webServer: Array.isArray(config.webServer)
    ? config.webServer.map((server, index) => ({
        ...server,
        // The mock keeps its stdout wait, so a stale mock gets the launcher's
        // message naming the port instead of Playwright's generic one.
        ...(index === 0 ? {} : { port: appPort }),
        env: {
          ...server.env,
          ...(index === 0
            ? { MOCK_PORT: String(mockPort) }
            : {
                GOATCOUNTER_URL: `http://127.0.0.1:${mockPort}`,
                GOATCOUNTER_ADMIN_URL: `http://localhost:${mockPort}`,
                // The rate Compose and Kubernetes deploy with; the mock has no
                // limit of its own.
                GOATCOUNTER_API_RATE: "20",
                PORT: String(appPort),
                ORIGIN: `http://127.0.0.1:${appPort}`,
              }),
        },
      }))
    : undefined,
});
