// Minimal GoatCounter stand-in for the e2e smoke tests: the login form, the
// TOTP step, and the API shapes the dashboard reads.
import http from "node:http";
import { gzipSync } from "node:zlib";

const PORT = Number(process.env.MOCK_PORT ?? 5187);
const PASSWORD = "correct-horse";
const MFA_EMAIL = "mfa@example.com";
const TOTP_CODE = "123456";
// Slow stats responses make the dashboard stream its widget data.
const STATS_DELAY_MS = Number(process.env.STATS_DELAY_MS ?? 0);

const settings = {
  allow_bosmang: false,
  allow_counter: true,
  allow_embed: [],
  collect: 510,
  collect_regions: [],
  data_retention: 365,
  ignore_ips: [],
  public: "private",
  secret: "",
};
const site = {
  cname: "demo.example",
  code: "demo",
  created_at: "2026-01-01",
  id: 1,
  link_domain: "https://example.com",
  received_data: true,
  settings,
  state: "active",
  updated_at: "2026-10-01",
};
const series = Array.from({ length: 7 }, (_, i) => ({
  daily: [180, 260, 220, 340, 290, 430, 360][i],
  day: `2026-10-${String(i + 3).padStart(2, "0")}`,
  hourly: Array.from({ length: 24 }, (_, h) => 3 + ((h + i) % 19)),
}));
const hits = ["/", "/blog", "/docs"].map((path, i) => ({
  count: [980, 700, 400][i],
  event: false,
  max: 430,
  path,
  path_id: i + 1,
  stats: series,
  title: ["Home", "Journal", "Docs"][i],
}));

const totpForm = `<form method="post" action="/user/totplogin">
  <input type="hidden" name="loginmac" value="mac-1">
  <input type="hidden" name="user_logintoken" value="token-1">
  <input type="text" name="totp_token">
</form>`;

function readForm(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(new URLSearchParams(body)));
  });
}

function redirect(res, location) {
  res.writeHead(303, { location });
  res.end();
}

function json(res, value) {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(value));
}

const requestCounts = new Map();
const exportJobs = new Map();
const modernExports = process.env.MOCK_MODERN_EXPORTS === "true";

http
  .createServer(async (req, res) => {
    const path = new URL(req.url, "http://localhost").pathname;
    if (path === "/__metrics") {
      return json(res, Object.fromEntries(requestCounts));
    }
    requestCounts.set(path, (requestCounts.get(path) ?? 0) + 1);
    if (path === "/status")
      return json(res, { version: modernExports ? "dev" : "v2.7.0" });
    if (STATS_DELAY_MS && path.includes("/stats/")) {
      await new Promise((resolve) => setTimeout(resolve, STATS_DELAY_MS));
    }

    if (path === "/user/requestlogin") {
      const form = await readForm(req);
      if (form.get("password") !== PASSWORD) return redirect(res, "/user/new");
      if (form.get("email") === MFA_EMAIL) {
        res.writeHead(200, { "content-type": "text/html" });
        return res.end(totpForm);
      }
      return redirect(res, "/");
    }

    if (path === "/user/totplogin") {
      const form = await readForm(req);
      if (form.get("loginmac") !== "mac-1") return redirect(res, "/user/new");
      if (form.get("totp_token") === TOTP_CODE) return redirect(res, "/");
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(totpForm);
    }

    if (path.endsWith("/me")) {
      return json(res, {
        token: { permissions: 255 },
        user: {
          email: "qa@example.com",
          id: 1,
          settings: { timezone: "UTC", twenty_four_hours: true },
          site: 1,
        },
      });
    }
    if (path.endsWith("/sites"))
      return json(res, {
        sites: [
          site,
          { ...site, id: 2, cname: "journal.example", code: "journal" },
        ],
      });
    if (path.includes("/sites/")) return json(res, site);
    if (path.endsWith("/total")) {
      const start =
        new URL(req.url, "http://localhost").searchParams.get("start") ?? "";
      // Fixed future periods exercise scheduled alert delivery without a clock override.
      const scheduled = start.startsWith("2040-04-");
      const total = scheduled
        ? start.startsWith("2040-04-01")
          ? 100
          : 300
        : 2080;
      return json(res, {
        stats: series,
        total,
        total_events: scheduled ? 0 : 42,
        total_utc: total,
      });
    }
    if (path.includes("/hits"))
      return json(res, { hits, more: false, total: 2080 });
    if (path.includes("/paths")) {
      return json(res, {
        more: false,
        paths: hits.map((h) => ({ id: h.path_id, ...h })),
      });
    }
    if (path === "/api/v0/export" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const input = JSON.parse(body);
      if (!modernExports && "format" in input) {
        res.writeHead(400, { "content-type": "application/json" });
        return res.end(
          JSON.stringify({ error: 'unknown parameter: "format"' })
        );
      }
      const id = exportJobs.size + 1;
      const job = {
        id,
        site_id: 1,
        ...(modernExports ? { format: input.format } : {}),
        created_at: new Date().toISOString(),
        finished_at: null,
        num_rows: null,
        size: null,
        error: input.start_from_hit_id === 999 ? "Fixture export failed" : null,
      };
      exportJobs.set(id, { job, reads: 0 });
      res.writeHead(202, { "content-type": "application/json" });
      return res.end(JSON.stringify(job));
    }
    const exportMatch = path.match(/^\/api\/v0\/export\/(\d+)(\/download)?$/);
    if (exportMatch) {
      const record = exportJobs.get(Number(exportMatch[1]));
      if (!record) {
        res.writeHead(404);
        return res.end();
      }
      if (!exportMatch[2]) {
        record.reads++;
        if (record.reads >= 2 && !record.job.error) {
          record.job.finished_at = new Date().toISOString();
          record.job.num_rows = record.job.format === "json" ? null : 2;
          record.job.size = "0.01";
        }
        return json(res, record.job);
      }
      if (!record.job.finished_at) {
        res.writeHead(202, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: "still being generated" }));
      }
      // JSON uses ZIP even though upstream advertises application/gzip.
      res.writeHead(200, { "content-type": "application/gzip" });
      return res.end(
        record.job.format === "json"
          ? Buffer.from("504b0506000000000000000000000000000000000000", "hex")
          : gzipSync("Path,Title\n/,Home\n/blog,Journal\n")
      );
    }

    const categories = {
      locations: ["United States", "Indonesia", "Germany"],
      toprefs: ["google.com", "github.com", "Direct"],
      campaigns: ["Newsletter", "Documentation", "Launch"],
      systems: ["Windows", "macOS", "Linux"],
      languages: ["English", "Indonesian", "German"],
      sizes: ["Desktop", "Mobile", "Tablet"],
    };
    const names = Object.entries(categories).find(([category]) =>
      path.includes(category)
    )?.[1] ?? ["Chrome", "Safari", "Firefox"];
    const stats = names.map((name, i) => ({
      count: [980, 760, 340][i],
      id: String(i + 1),
      name,
    }));
    return json(res, { more: false, refs: stats, stats });
  })
  .listen(PORT, "127.0.0.1");
