#!/usr/bin/env node
// Retakes docs/screenshots/*.png (README and the landing page demo) from a
// local build against a real GoatCounter seeded with synthetic visits.
//
//   node scripts/capture-screenshots.mjs seed     # needs GOATCOUNTER_URL,
//                                                  # GOATCOUNTER_API_KEY, GOATCOUNTER_VHOST
//   goatcounter db query "<printed SQL>" -format exec  # visitor languages
//   node scripts/capture-screenshots.mjs capture  # needs GTCD_URL, GTCD_EMAIL,
//                                                  # GTCD_PASSWORD, GTCD_MFA_EMAIL
//
// GoatCounter runs from the pinned image in k8s/gtcd/goatcounter.yaml with
// high rate limits, a site whose vhost is GOATCOUNTER_VHOST, a user in
// ID.Asia/Jakarta with ISO dates and comma separators, a token for all sites
// (permissions 127, sites [-1]) and a second user with TOTP on for the
// two-factor shot. gtcd runs `node build` against it with an isolated Redis
// and no Turnstile keys: Cloudflare's test widget stamps "For testing only"
// across itself. Numbers are synthetic; the seed is fixed, so a retake shows
// the same mix with today's dates.
//
// ponytail: the count API takes no language (only the /count pixel's
// Accept-Language does, at the current time), so `seed` prints SQL that
// splits each day's language_stats over a fixed mix. Rerun it after a seed.

import { chromium } from "@playwright/test";
import http from "node:http";
import { mkdir } from "node:fs/promises";

const OUT = new URL("../docs/screenshots/", import.meta.url).pathname;
const HOUR = 3_600_000;

// mulberry32: a small fixed-seed PRNG, so every retake seeds the same mix.
function prng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
const random = prng(20261120);
function pick(weighted) {
  const total = weighted.reduce((sum, [, w]) => sum + w, 0);
  let r = random() * total;
  for (const [value, w] of weighted) if ((r -= w) < 0) return value;
  return weighted.at(-1)[0];
}

const PAGES = [
  [["/", "Home"], 30],
  [["/blog", "Journal"], 12],
  [["/docs", "Docs"], 12],
  [["/pricing", "Pricing"], 10],
  [["/blog/self-hosted-analytics", "Self-hosted analytics without cookies"], 9],
  [["/docs/install", "Install gtcd"], 8],
  [["/changelog", "Changelog"], 7],
  [["/docs/api", "API reference"], 5],
  [["/about", "About"], 4],
];
const EVENTS = [
  [["signup-click", "Sign up"], 3],
  [["copy-install-command", "Copy install command"], 2],
];
const AGENTS = [
  // [user agent, weight, size class]
  [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    22,
    "desktop",
  ],
  [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    6,
    "desktop",
  ],
  [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    10,
    "laptop",
  ],
  [
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
    10,
    "mobile",
  ],
  [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15",
    9,
    "laptop",
  ],
  [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1",
    12,
    "mobile",
  ],
  [
    "Mozilla/5.0 (iPad; CPU OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1",
    2,
    "tablet",
  ],
  [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0",
    6,
    "desktop",
  ],
  [
    "Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0",
    5,
    "desktop",
  ],
  [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
    9,
    "desktop",
  ],
  [
    "Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36",
    5,
    "mobile",
  ],
  [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/124.0.0.0",
    3,
    "desktop",
  ],
];
// Width, height and pixel ratio, as the count API takes them.
const SIZES = {
  desktop: "1920,1080,1",
  laptop: "1440,900,2",
  mobile: "390,844,3",
  tablet: "820,1180,2",
};
const COUNTRIES = [
  ["ID", 32],
  ["US", 18],
  ["DE", 8],
  ["SG", 7],
  ["JP", 6],
  ["GB", 6],
  ["IN", 5],
  ["NL", 4],
  ["AU", 4],
  ["BR", 4],
  ["FR", 3],
  ["CA", 3],
];
const REFERRERS = [
  ["", 18],
  ["https://www.google.com/", 28],
  ["https://github.com/haikelz/gtcd", 12],
  ["https://news.ycombinator.com/", 8],
  ["https://duckduckgo.com/", 5],
  ["https://www.reddit.com/r/selfhosted/", 4],
  ["https://t.co/", 3],
];
const CAMPAIGNS = [
  ["", 90],
  ["?utm_campaign=launch-week", 5],
  ["?utm_campaign=newsletter-november", 3],
  ["?utm_campaign=product-hunt", 2],
];
// ISO 639-3, as GoatCounter stores them, with each one's share in percent.
const LANGUAGES = [
  ["eng", 45],
  ["ind", 30],
  ["deu", 8],
  ["jpn", 6],
  ["nld", 4],
  ["fra", 4],
  ["por", 3],
];
const LANGUAGE_SQL = [
  "CREATE TEMP TABLE mix (language varchar, pct integer)",
  `INSERT INTO mix VALUES ${LANGUAGES.map(([code, pct]) => `('${code}', ${pct})`).join(", ")}`,
  "INSERT INTO language_stats (site_id, path_id, day, language, count) SELECT s.site_id, s.path_id, s.day, mix.language, (s.count * mix.pct + 50) / 100 FROM language_stats s, mix WHERE s.language = '' AND (s.count * mix.pct + 50) / 100 > 0",
  "DELETE FROM language_stats WHERE language = ''",
].join("; ");

/** Visits in one local hour: a working-day curve peaking mid-afternoon. */
function visitsAt(localHour, weekday, dayIndex) {
  const curve = Math.max(0.08, Math.sin(((localHour - 6) / 18) * Math.PI));
  const week = weekday === 0 || weekday === 6 ? 0.65 : 1;
  const growth = 0.85 + dayIndex * 0.01;
  return Math.round(30 * curve * week * growth * (0.75 + random() * 0.5));
}

function request(base, { path, method = "GET", headers = {}, body }) {
  const url = new URL(path, base);
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, (res) => {
      let text = "";
      res.on("data", (chunk) => (text += chunk));
      res.on("end", () => resolve({ status: res.statusCode, text }));
    });
    req.on("error", reject);
    req.end(body);
  });
}

async function seed() {
  const { GOATCOUNTER_URL: base, GOATCOUNTER_API_KEY: key } = process.env;
  const host = process.env.GOATCOUNTER_VHOST;
  if (!base || !key || !host)
    throw new Error(
      "Set GOATCOUNTER_URL, GOATCOUNTER_API_KEY and GOATCOUNTER_VHOST."
    );
  // Thousands of synthetic hits cannot be taken back: refuse a remote
  // GoatCounter (a shell that sourced k8s/.env) unless explicitly allowed.
  const { hostname } = new URL(base);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(hostname) &&
    process.env.SEED_ALLOW_REMOTE !== "1"
  ) {
    throw new Error(
      `Refusing to seed ${hostname}: point GOATCOUNTER_URL at a local GoatCounter, or set SEED_ALLOW_REMOTE=1.`
    );
  }

  const hits = [];
  const now = Date.now();
  let session = 0;
  for (let day = 20; day >= 0; day--) {
    for (let hour = 0; hour < 24; hour++) {
      const at = now - day * 24 * HOUR - hour * HOUR;
      if (at > now) continue;
      // Jakarta is UTC+7.
      const local = new Date(at + 7 * HOUR);
      const n = visitsAt(local.getUTCHours(), local.getUTCDay(), 20 - day);
      for (let v = 0; v < n; v++) {
        session++;
        const [ua, , size] =
          AGENTS[AGENTS.indexOf(pick(AGENTS.map((a) => [a, a[1]])))];
        const visitor = {
          location: pick(COUNTRIES),
          session: `synthetic-${session}`,
          size: SIZES[size],
          user_agent: ua,
        };
        const created = new Date(
          at - Math.floor(random() * HOUR) - 60_000
        ).toISOString();
        // Most visits read one page; later pages keep the visit's referrer.
        const views = random() < 0.75 ? 1 : 2 + Math.floor(random() * 2);
        const ref = pick(REFERRERS);
        for (let i = 0; i < views; i++) {
          const [path, title] = pick(PAGES);
          hits.push({
            ...visitor,
            created_at: created,
            path,
            query: i === 0 ? pick(CAMPAIGNS) : "",
            ref,
            title,
          });
        }
        if (random() < 0.05) {
          const [path, title] = pick(EVENTS);
          hits.push({
            ...visitor,
            created_at: created,
            event: true,
            path,
            title,
          });
        }
      }
    }
  }

  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Host: host,
  };
  for (let i = 0; i < hits.length; i += 100) {
    const res = await request(base, {
      body: JSON.stringify({
        hits: hits.slice(i, i + 100),
        no_sessions: false,
      }),
      headers,
      method: "POST",
      path: "/api/v0/count",
    });
    if (res.status !== 202) throw new Error(`count: ${res.status} ${res.text}`);
  }

  console.log(
    `seeded ${hits.length} hits over 21 days; once GoatCounter has stored them, run:`
  );
  console.log(`goatcounter db query "${LANGUAGE_SQL}" -format exec`);
}

async function capture() {
  const {
    GTCD_URL: base,
    GTCD_EMAIL: email,
    GTCD_PASSWORD: password,
  } = process.env;
  const mfaEmail = process.env.GTCD_MFA_EMAIL;
  if (!base || !email || !password || !mfaEmail)
    throw new Error(
      "Set GTCD_URL, GTCD_EMAIL, GTCD_PASSWORD and GTCD_MFA_EMAIL."
    );
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const week = "range=week";

  async function context({
    theme = "light",
    locale = "en",
    width = 1920,
    height = 990,
  } = {}) {
    const ctx = await browser.newContext({
      deviceScaleFactor: 1,
      locale: locale === "id" ? "id-ID" : "en-GB",
      timezoneId: "Asia/Jakarta",
      viewport: { height, width },
    });
    await ctx.addInitScript(
      (t) => localStorage.setItem("gtcd_theme", t),
      theme
    );
    if (locale === "id") {
      await ctx.addCookies([{ name: "gtcd_locale", url: base, value: "id" }]);
    }
    return ctx;
  }
  async function signIn(page, who = email) {
    await page.goto(`${base}/login`);
    await page.getByLabel(/Email/).fill(who);
    await page
      .getByLabel(/Password|Kata sandi/, { exact: false })
      .first()
      .fill(password);
    await waitForTurnstile(page);
    await page.getByRole("button", { name: /Sign in|Masuk/ }).click();
  }
  async function waitForTurnstile(page) {
    // The test key passes at once; wait for its token so the shot shows the check.
    await page
      .waitForFunction(
        () => {
          const field = document.querySelector(
            '[name="cf-turnstile-response"]'
          );
          return !field || field.value.length > 0;
        },
        null,
        { timeout: 15_000 }
      )
      .catch(() => {});
  }
  async function settle(page) {
    await page.waitForLoadState("networkidle").catch(() => {});
    // Streamed reports and chart transitions finish after the network quiets.
    await page.waitForTimeout(1_200);
  }
  async function shot(page, name, path) {
    if (path) await page.goto(base + path);
    await settle(page);
    await page.screenshot({ path: `${OUT}${name}.png` });
    console.log(`  ${name}.png`);
  }

  for (const theme of ["light", "dark"]) {
    const ctx = await context({ theme });
    const page = await ctx.newPage();
    await page.goto(`${base}/login`);
    await page.getByLabel(/Email/).fill(email);
    await waitForTurnstile(page);
    await page.getByLabel(/Email/).blur();
    await shot(page, theme === "dark" ? "login-dark" : "login");
    if (theme === "light") {
      await signIn(page, mfaEmail);
      await page
        .getByRole("heading", { name: "Two-factor authentication" })
        .waitFor();
      await shot(page, "login-mfa");
    }
    await ctx.close();
  }

  for (const [name, options] of [
    ["traffic", { height: 1650 }],
    ["traffic-dark", { height: 1650, theme: "dark" }],
    ["traffic-id", { height: 1650, locale: "id" }],
    ["traffic-mobile", { height: 844, width: 390 }],
    ["traffic-mobile-dark", { height: 844, theme: "dark", width: 390 }],
  ]) {
    const ctx = await context(options);
    const page = await ctx.newPage();
    await signIn(page);
    await page.waitForURL(/\/dashboard/);
    await shot(page, name, `/dashboard?${week}`);
    await ctx.close();
  }

  const ctx = await context();
  const page = await ctx.newPage();
  await signIn(page);
  await page.waitForURL(/\/dashboard/);
  for (const [name, path] of [
    ["pages", `/dashboard/pages?${week}`],
    ["paths", "/dashboard/paths"],
    ["browsers", `/dashboard/browsers?${week}`],
    ["operating-systems", `/dashboard/systems?${week}`],
    ["locations", `/dashboard/locations?${week}`],
    ["languages", `/dashboard/languages?${week}`],
    ["screen-size", `/dashboard/devices?${week}`],
    ["campaigns", `/dashboard/campaigns?${week}`],
    ["referrers", `/dashboard/referrers?${week}`],
    ["customize", "/dashboard/customize"],
    ["settings", "/dashboard/settings"],
    ["exports", "/dashboard/exports"],
  ]) {
    await shot(page, name, path);
  }

  await page.goto(`${base}/dashboard/pages?${week}`);
  await page
    .getByRole("link", { name: /^\/blog\b/ })
    .first()
    .click();
  await page.waitForURL(/\/dashboard\/pages\/\d+/);
  await shot(page, "page-detail");

  await page.goto(`${base}/dashboard/browsers?${week}`);
  await settle(page);
  await page
    .getByRole("link", { name: /^Explore Chrome:/ })
    .first()
    .click();
  await page.waitForURL(/\/dashboard\/reports\//);
  await shot(page, "report-detail");

  await page.goto(`${base}/dashboard/this-page-does-not-exist`);
  await shot(page, "not-found");

  await page.goto(`${base}/dashboard/settings`);
  await settle(page);
  const create = page.getByRole("button", { name: "Create public link" });
  if (await create.count()) await create.click();
  const link = page.getByRole("textbox", { name: "Public dashboard link" });
  await link.waitFor();
  const sharePath = new URL(await link.inputValue()).pathname + `?${week}`;
  await ctx.close();
  for (const theme of ["light", "dark"]) {
    const visitor = await context({ theme });
    const sharePage = await visitor.newPage();
    await shot(sharePage, theme === "dark" ? "share-dark" : "share", sharePath);
    await visitor.close();
  }

  // Dark twins the landing page shows in its dark theme.
  const dark = await context({ theme: "dark" });
  const darkPage = await dark.newPage();
  await signIn(darkPage);
  await darkPage.waitForURL(/\/dashboard/);
  for (const [name, path] of [
    ["pages-dark", `/dashboard/pages?${week}`],
    ["locations-dark", `/dashboard/locations?${week}`],
    ["customize-dark", "/dashboard/customize"],
  ]) {
    await shot(darkPage, name, path);
  }
  await dark.close();

  await browser.close();
}

const step = process.argv[2];
if (step === "seed") await seed();
else if (step === "capture") await capture();
else {
  console.error("Usage: node scripts/capture-screenshots.mjs seed|capture");
  process.exit(1);
}
