// Minimal GoatCounter stand-in for the e2e smoke tests: the login form, the
// TOTP step, and the API shapes the dashboard reads.
import http from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 5187);
const PASSWORD = "correct-horse";
const MFA_EMAIL = "mfa@example.com";
const TOTP_CODE = "123456";

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
  count: 980 - i * 140,
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

http
  .createServer(async (req, res) => {
    const path = new URL(req.url, "http://localhost").pathname;

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
    if (path.endsWith("/sites")) return json(res, { sites: [site] });
    if (path.includes("/sites/")) return json(res, site);
    if (path.endsWith("/total")) {
      return json(res, {
        stats: series,
        total: 2080,
        total_events: 42,
        total_utc: 2080,
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
    if (path.includes("/export")) return json(res, { exports: [] });

    const stats = ["Chrome", "Safari", "Firefox"].map((name, i) => ({
      count: 980 - i * 220,
      id: String(i + 1),
      name,
    }));
    return json(res, { more: false, refs: stats, stats });
  })
  .listen(PORT, "127.0.0.1");
