import type { Locale } from "$lib/dashboard-layout.js";
import {
  type MessageKey,
  type MessageParams,
  translate,
} from "$lib/i18n/index.js";
import {
  applyDisplayOverrides,
  formatDate,
  formatNumber,
  toDisplayPreferences,
  toZonedRFC3339,
  wallClockNow,
} from "$lib/preferences.js";
import {
  isReportDue,
  isReportFrequency,
  latestCompletedPeriod,
  type ReportFrequency,
  type ReportPeriod,
} from "$lib/report-period.js";
import { getDashboardLayout } from "$lib/server/dashboard-layout-store.js";
import { getSites } from "$lib/server/goatcounter/admin.js";
import { getVhost } from "$lib/server/goatcounter/client.js";
import { getMe, getTotal } from "$lib/server/goatcounter/stats.js";
import type { Site } from "$lib/server/goatcounter/types.js";
import { acquireLock, getJson, setJson } from "$lib/server/kv.js";
import {
  getPublicUrl,
  isMailConfigured,
  sendMail,
} from "$lib/server/mailer.js";
import { loadReportSummary } from "$lib/server/report-summary.js";

export type EmailReportSubscription = {
  readonly frequency: ReportFrequency;
  readonly lastError: string | null;
  readonly lastPeriodKey: string | null;
  readonly lastSentAt: string | null;
  /** null: the API token owner's default site. */
  readonly siteId: number | null;
};

const SUBSCRIBERS_KEY = "email-report:subscribers";
const LOCK_KEY = "email-report:scheduler-lock";
const TICK_MS = 15 * 60_000;

export const DEFAULT_SUBSCRIPTION: EmailReportSubscription = {
  frequency: "never",
  lastError: null,
  lastPeriodKey: null,
  lastSentAt: null,
  siteId: null,
};

const FREQUENCY_TITLES: Record<
  Exclude<ReportFrequency, "never">,
  MessageKey
> = {
  biweekly: "email.reportBiweekly",
  daily: "email.reportDaily",
  monthly: "email.reportMonthly",
  weekly: "email.reportWeekly",
};

/** The recipient's gtcd language override, else GoatCounter's language. */
async function recipientLocale(
  email: string,
  settings: unknown
): Promise<Locale> {
  const { overrides } = await getDashboardLayout(email);
  return applyDisplayOverrides(toDisplayPreferences(settings), overrides)
    .locale;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function subscriptionKey(email: string): string {
  return `email-report:${normalizeEmail(email)}`;
}

function parseSubscription(value: unknown): EmailReportSubscription {
  if (typeof value !== "object" || value === null) return DEFAULT_SUBSCRIPTION;

  const record = value as Record<string, unknown>;
  const text = (field: unknown) =>
    typeof field === "string" && field ? field : null;

  return {
    frequency: isReportFrequency(record.frequency) ? record.frequency : "never",
    lastError: text(record.lastError),
    lastPeriodKey: text(record.lastPeriodKey),
    lastSentAt: text(record.lastSentAt),
    siteId:
      typeof record.siteId === "number" && Number.isSafeInteger(record.siteId)
        ? record.siteId
        : null,
  };
}

async function getSubscribers(): Promise<string[]> {
  const value = await getJson(SUBSCRIBERS_KEY);
  return Array.isArray(value)
    ? value.filter((email): email is string => typeof email === "string")
    : [];
}

export async function getSubscription(
  email: string
): Promise<EmailReportSubscription> {
  return parseSubscription(await getJson(subscriptionKey(email)));
}

async function writeSubscription(
  email: string,
  subscription: EmailReportSubscription
): Promise<void> {
  await setJson(subscriptionKey(email), subscription);

  const subscribers = new Set(await getSubscribers());
  const normalized = normalizeEmail(email);
  if (subscription.frequency === "never") subscribers.delete(normalized);
  else subscribers.add(normalized);
  await setJson(SUBSCRIBERS_KEY, [...subscribers]);
}

/**
 * Save a user's choice. A new or changed frequency starts from the current
 * period, so subscribing never triggers an immediate catch-up email.
 */
export async function updateSubscription(
  email: string,
  frequency: ReportFrequency,
  siteId: number | null
): Promise<void> {
  const current = await getSubscription(email);
  let lastPeriodKey = current.lastPeriodKey;

  if (frequency !== "never" && frequency !== current.frequency) {
    const me = await getMe();
    const { timezone } = toDisplayPreferences(me.user.settings);
    lastPeriodKey = latestCompletedPeriod(
      frequency,
      wallClockNow(timezone)
    ).key;
  }

  await writeSubscription(email, {
    ...current,
    frequency,
    lastError: null,
    lastPeriodKey,
    siteId,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function changeLabel(current: number, previous: number): string | null {
  if (previous <= 0) return null;

  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? "+" : ""}${change}%`;
}

type Report = {
  readonly html: string;
  readonly subject: string;
  readonly text: string;
};

type Ranked = { readonly count: number; readonly name: string };

/**
 * Build the email for one period and site, in the owner's display settings
 * and the recipient's language.
 */
async function buildReport(
  frequency: Exclude<ReportFrequency, "never">,
  period: ReportPeriod,
  site: Site,
  settings: unknown,
  locale: Locale
): Promise<Report> {
  const tr = (key: MessageKey, params?: MessageParams) =>
    translate(locale, key, params);
  const preferences = toDisplayPreferences(settings);
  const options = { vhost: site.cname ?? getVhost() };
  const range = {
    end: toZonedRFC3339(period.end, preferences.timezone),
    start: toZonedRFC3339(period.start, preferences.timezone),
  };
  const summary = loadReportSummary(range, options, 5);
  const [total, previousTotal, hits, referrers, locations] = await Promise.all([
    summary.total,
    getTotal(
      toZonedRFC3339(period.previousStart, preferences.timezone),
      toZonedRFC3339(period.previousEnd, preferences.timezone),
      undefined,
      options
    ).catch(() => null),
    summary.hits,
    summary.referrers,
    summary.locations,
  ]);

  if (!total) throw new Error(tr("email.noTotals"));

  const siteName = site.cname || site.code;
  const count = (value: number) =>
    formatNumber(value, preferences.numberSeparator);
  const hideNumbers = preferences.fewerNumbers;
  const change = changeLabel(total.total, previousTotal?.total ?? 0);
  const periodLabel =
    frequency === "daily"
      ? formatDate(period.start, preferences.dateFormat, "full", locale)
      : `${formatDate(period.start, preferences.dateFormat, "full", locale)} – ${formatDate(period.end, preferences.dateFormat, "full", locale)}`;
  const headline = hideNumbers
    ? change
      ? tr("email.headlineChange", { change })
      : tr("email.headlineSummary")
    : change
      ? tr("email.headlineCountChange", {
          change,
          count: count(total.total),
        })
      : tr("email.headlineCount", { count: count(total.total) });
  const reportTitle = tr(FREQUENCY_TITLES[frequency]);
  const unknownName = tr("email.unknown");
  const noData = tr("email.noData");
  const manage = tr("email.manage");
  const manageFallback = tr("email.manageFallback");

  const sections: { readonly rows: Ranked[]; readonly title: string }[] = [
    {
      rows: (hits?.hits ?? []).map((hit) => ({
        count: hit.count,
        name: hit.path,
      })),
      title: tr("email.topPages"),
    },
    {
      rows: (referrers?.stats ?? []).map((stat) => ({
        count: stat.count,
        name: stat.name?.trim() || unknownName,
      })),
      title: tr("email.topReferrers"),
    },
    {
      rows: (locations?.stats ?? []).map((stat) => ({
        count: stat.count,
        name: stat.name?.trim() || unknownName,
      })),
      title: tr("email.topCountries"),
    },
  ];

  const publicUrl = getPublicUrl();
  const dashboardUrl = publicUrl
    ? `${publicUrl}/dashboard?site=${site.id}`
    : null;
  const settingsUrl = publicUrl ? `${publicUrl}/dashboard/customize` : null;

  const text = [
    tr("email.reportFor", { report: reportTitle, site: siteName }),
    periodLabel,
    "",
    headline,
    ...sections.flatMap((section) => [
      "",
      section.title,
      ...(section.rows.length
        ? section.rows.map((row) =>
            hideNumbers ? `- ${row.name}` : `- ${row.name}: ${count(row.count)}`
          )
        : [`- ${noData}`]),
    ]),
    "",
    ...(dashboardUrl
      ? [tr("email.openDashboardUrl", { url: dashboardUrl })]
      : []),
    settingsUrl ? tr("email.manageUrl", { url: settingsUrl }) : manageFallback,
  ].join("\n");

  const tableRows = (rows: Ranked[]) =>
    rows.length
      ? rows
          .map(
            (row) =>
              `<tr><td style="padding:6px 0;border-bottom:1px solid #e5e5e5;word-break:break-all">${escapeHtml(row.name)}</td>${
                hideNumbers
                  ? ""
                  : `<td style="padding:6px 0 6px 16px;border-bottom:1px solid #e5e5e5;text-align:right;font-variant-numeric:tabular-nums">${count(row.count)}</td>`
              }</tr>`
          )
          .join("")
      : `<tr><td style="padding:6px 0;color:#696969">${escapeHtml(noData)}</td></tr>`;

  const html = `<!doctype html>
<html lang="${locale}"><body style="margin:0;background:#f5f5f5;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#0a0a0a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px">
<tr><td style="padding:24px">
<p style="margin:0;font-size:12px;color:#696969">${escapeHtml(reportTitle)} · ${escapeHtml(periodLabel)}</p>
<h1 style="margin:4px 0 0;font-size:18px">${escapeHtml(siteName)}</h1>
<p style="margin:16px 0 0;font-size:24px;font-weight:600">${escapeHtml(headline)}</p>
${sections
  .map(
    (section) =>
      `<h2 style="margin:24px 0 4px;font-size:14px">${escapeHtml(section.title)}</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${tableRows(section.rows)}</table>`
  )
  .join("")}
${dashboardUrl ? `<p style="margin:24px 0 0"><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#171717;color:#fafafa;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:14px">${escapeHtml(tr("email.openDashboard"))}</a></p>` : ""}
<p style="margin:24px 0 0;font-size:12px;color:#696969">${
    settingsUrl
      ? `<a href="${escapeHtml(settingsUrl)}" style="color:#696969">${escapeHtml(manage)}</a>`
      : escapeHtml(manageFallback)
  }</p>
</td></tr></table></td></tr></table>
</body></html>`;

  return {
    html,
    subject: tr("email.subject", {
      headline,
      title: tr("email.reportFor", {
        report: reportTitle,
        site: siteName,
      }),
    }),
    text,
  };
}

async function resolveSite(
  siteId: number | null,
  defaultSiteId: number,
  locale: Locale
): Promise<Site> {
  const sites = await getSites();
  const site =
    sites.find((candidate) => candidate.id === (siteId ?? defaultSiteId)) ??
    sites.find((candidate) => candidate.id === defaultSiteId);
  if (!site) throw new Error(translate(locale, "email.siteUnavailable"));

  return site;
}

/** Send one report now, for the test button; does not change the schedule. */
export async function sendTestReport(email: string): Promise<void> {
  const subscription = await getSubscription(email);
  const frequency =
    subscription.frequency === "never" ? "weekly" : subscription.frequency;
  const me = await getMe();
  const { timezone } = toDisplayPreferences(me.user.settings);
  const locale = await recipientLocale(email, me.user.settings);
  const site = await resolveSite(subscription.siteId, me.user.site, locale);
  const report = await buildReport(
    frequency,
    latestCompletedPeriod(frequency, wallClockNow(timezone)),
    site,
    me.user.settings,
    locale
  );

  await sendMail({ ...report, to: email });
}

/** Send every report whose period completed since it was last sent. */
export async function sendDueReports(now: Date = new Date()): Promise<void> {
  if (!isMailConfigured()) return;
  // Shorter than the tick, so a crashed holder never blocks the next run.
  if (!(await acquireLock(LOCK_KEY, 10 * 60))) return;

  const subscribers = await getSubscribers();
  if (subscribers.length === 0) return;

  const me = await getMe();
  const { timezone } = toDisplayPreferences(me.user.settings);
  const localNow = wallClockNow(timezone, now);

  for (const email of subscribers) {
    const subscription = await getSubscription(email);
    if (subscription.frequency === "never") continue;
    if (
      !isReportDue(subscription.frequency, localNow, subscription.lastPeriodKey)
    ) {
      continue;
    }

    const period = latestCompletedPeriod(subscription.frequency, localNow);
    let locale: Locale = "en";
    try {
      locale = await recipientLocale(email, me.user.settings);
      const site = await resolveSite(subscription.siteId, me.user.site, locale);
      const report = await buildReport(
        subscription.frequency,
        period,
        site,
        me.user.settings,
        locale
      );
      await sendMail({ ...report, to: email });
      await writeSubscription(email, {
        ...subscription,
        lastError: null,
        lastPeriodKey: period.key,
        lastSentAt: now.toISOString(),
      });
    } catch (cause: unknown) {
      // Keep the period unsent so the next tick retries; surface the reason.
      await writeSubscription(email, {
        ...subscription,
        lastError:
          cause instanceof Error
            ? cause.message
            : translate(locale, "email.sendFailed"),
      });
    }
  }
}

const SCHEDULER_KEY = Symbol.for("gtcd.emailReportScheduler");

/** Start the report tick once per process (dev reloads reuse the timer). */
export function startReportScheduler(): void {
  const holder = globalThis as typeof globalThis & {
    [SCHEDULER_KEY]?: ReturnType<typeof setInterval>;
  };
  if (holder[SCHEDULER_KEY]) return;

  const tick = () => {
    sendDueReports().catch((cause: unknown) => {
      console.error(
        "email reports:",
        cause instanceof Error ? cause.message : cause
      );
    });
  };

  holder[SCHEDULER_KEY] = setInterval(tick, TICK_MS);
  holder[SCHEDULER_KEY].unref?.();
  setTimeout(tick, 60_000).unref?.();
}
