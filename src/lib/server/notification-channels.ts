import { randomInt } from "node:crypto";
import type { Locale } from "$lib/dashboard-layout.js";
import { translate } from "$lib/i18n/index.js";
import { toDisplayPreferences, wallClockNow } from "$lib/preferences.js";
import {
  isReportDue,
  isReportFrequency,
  latestCompletedPeriod,
  type ReportFrequency,
  type ReportPeriod,
} from "$lib/report-period.js";
import {
  acquireDeliveryLease,
  deliveryIdentity,
  runDeliveryJob,
  selectDeliveryPeriod,
} from "$lib/server/delivery-jobs.js";
import {
  readDurableJson,
  updateDurableJson,
} from "$lib/server/durable-state.js";
import {
  buildReport,
  buildTrafficAlert,
  recipientLocale,
} from "$lib/server/email-reports.js";
import { getSites } from "$lib/server/goatcounter/admin.js";
import { getMe } from "$lib/server/goatcounter/stats.js";
import type { Site } from "$lib/server/goatcounter/types.js";
import { getPublicUrl } from "$lib/server/mailer.js";
import {
  checkWebhookTarget,
  postWebhook,
} from "$lib/server/webhook-request.js";
import {
  CHANNEL_TYPES,
  type ChannelEvent,
  type ChannelType,
  channelRequest,
  isTelegramTarget,
  maskSecret,
} from "$lib/server/webhook-target.js";
import {
  parseTrafficAlertRule,
  type TrafficAlertRule,
} from "$lib/traffic-alert.js";

type SummaryFrequency = Exclude<ReportFrequency, "never">;

type StoredChannel = {
  readonly alert: TrafficAlertRule | null;
  readonly alertPeriodKey: string | null;
  /** Telegram only. */
  readonly chatId: string | null;
  readonly createdAt: string;
  /** The admin whose language and display overrides the messages use. */
  readonly createdBy: string;
  readonly id: string;
  readonly label: string;
  readonly lastFailureAt: string | null;
  readonly lastSentAt: string | null;
  /** Webhook URL, or the Telegram bot token. Never sent to the browser. */
  readonly secret: string;
  readonly summary: SummaryFrequency | null;
  readonly summaryPeriodKey: string | null;
  readonly type: ChannelType;
};

/** What the browser may see: the secret only in masked form. */
export type ChannelView = Omit<
  StoredChannel,
  "alertPeriodKey" | "secret" | "summaryPeriodKey"
> & { readonly target: string };

export type ChannelInput = {
  readonly alert: TrafficAlertRule | null;
  readonly chatId: string;
  readonly label: string;
  readonly secret: string;
  readonly summary: SummaryFrequency | null;
  readonly type: ChannelType;
};

const MAX_CHANNELS_PER_SITE = 10;
const ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TICK_MS = 15 * 60_000;
const RUN_BUDGET_MS = 8 * 60_000;

export class ChannelLimitReached extends Error {
  constructor() {
    super(`A site can have up to ${MAX_CHANNELS_PER_SITE} channels`);
    this.name = "ChannelLimitReached";
  }
}

export function isChannelType(value: unknown): value is ChannelType {
  return CHANNEL_TYPES.some((type) => type === value);
}

function siteKey(siteId: number): string {
  return `notification-channel:site:${siteId}`;
}

function recipientKey(channel: StoredChannel): string {
  return `channel:${channel.id}`;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function parseChannels(value: unknown): StoredChannel[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_CHANNELS_PER_SITE)
    throw new Error("Invalid notification channel storage");

  return value.flatMap((candidate: unknown) => {
    if (typeof candidate !== "object" || candidate === null) return [];
    const entry = candidate as Record<string, unknown>;
    const summary = isReportFrequency(entry.summary) ? entry.summary : null;
    if (
      !isChannelType(entry.type) ||
      typeof entry.id !== "string" ||
      !/^[A-Za-z0-9]{24}$/.test(entry.id) ||
      typeof entry.label !== "string" ||
      typeof entry.secret !== "string" ||
      typeof entry.createdBy !== "string" ||
      typeof entry.createdAt !== "string"
    )
      return [];

    return [
      {
        alert: parseTrafficAlertRule(entry.alert),
        alertPeriodKey: text(entry.alertPeriodKey),
        chatId: text(entry.chatId),
        createdAt: entry.createdAt,
        createdBy: entry.createdBy,
        id: entry.id,
        label: entry.label,
        lastFailureAt: text(entry.lastFailureAt),
        lastSentAt: text(entry.lastSentAt),
        secret: entry.secret,
        summary: summary === "never" ? null : summary,
        summaryPeriodKey: text(entry.summaryPeriodKey),
        type: entry.type,
      },
    ];
  });
}

async function readChannels(siteId: number): Promise<StoredChannel[]> {
  return parseChannels(await readDurableJson(siteKey(siteId)));
}

function toView(channel: StoredChannel): ChannelView {
  return {
    alert: channel.alert,
    chatId: channel.chatId,
    createdAt: channel.createdAt,
    createdBy: channel.createdBy,
    id: channel.id,
    label: channel.label,
    lastFailureAt: channel.lastFailureAt,
    lastSentAt: channel.lastSentAt,
    summary: channel.summary,
    target: maskSecret(channel.type, channel.secret),
    type: channel.type,
  };
}

/** A site's channels with masked secrets; fails closed without Redis. */
export async function listChannels(siteId: number): Promise<ChannelView[]> {
  return (await readChannels(siteId)).map(toView);
}

/**
 * Validate and save a channel. Webhook URLs are checked against the SSRF
 * guard now and again on every send. Like email, a new channel starts from
 * the current period and never sends a catch-up message.
 */
export async function addChannel(
  siteId: number,
  input: ChannelInput,
  createdBy: string
): Promise<ChannelView> {
  const label = input.label.trim();
  const secret = input.secret.trim();
  const chatId = input.chatId.trim();
  if (
    !label ||
    label.length > 80 ||
    (!input.alert && !input.summary) ||
    (input.type === "telegram" && !isTelegramTarget(secret, chatId))
  )
    throw new RangeError("Invalid notification channel");
  if (input.type !== "telegram") await checkWebhookTarget(secret);

  const me = await getMe();
  const localNow = wallClockNow(
    toDisplayPreferences(me.user.settings).timezone
  );
  const channel: StoredChannel = {
    alert: input.alert,
    alertPeriodKey: latestCompletedPeriod("daily", localNow).key,
    chatId: input.type === "telegram" ? chatId : null,
    createdAt: new Date().toISOString(),
    createdBy: createdBy.trim().toLowerCase(),
    id: Array.from(
      { length: 24 },
      () => ID_ALPHABET[randomInt(ID_ALPHABET.length)]
    ).join(""),
    label,
    lastFailureAt: null,
    lastSentAt: null,
    secret,
    summary: input.summary,
    summaryPeriodKey: input.summary
      ? latestCompletedPeriod(input.summary, localNow).key
      : null,
    type: input.type,
  };

  await updateDurableJson(siteKey(siteId), (value) => {
    const channels = parseChannels(value);
    if (channels.length >= MAX_CHANNELS_PER_SITE)
      throw new ChannelLimitReached();
    return [...channels, channel];
  });
  return toView(channel);
}

/** Remove a channel and return what it was, for the audit trail. */
export async function deleteChannel(
  siteId: number,
  id: string
): Promise<ChannelView> {
  let removed: StoredChannel | undefined;
  await updateDurableJson(siteKey(siteId), (value) => {
    const channels = parseChannels(value);
    removed = channels.find((channel) => channel.id === id);
    if (!removed) throw new RangeError("Unknown notification channel");
    return channels.filter((channel) => channel.id !== id);
  });
  if (!removed) throw new RangeError("Unknown notification channel");

  return toView(removed);
}

async function send(
  channel: StoredChannel,
  message: ChannelEvent
): Promise<void> {
  const request = channelRequest(channel, message);
  await postWebhook(request.url, request.body);
}

/** Send a short message now; does not touch the schedule. */
export async function sendTestMessage(
  site: { readonly cname?: string; readonly code: string; readonly id: number },
  id: string,
  locale: Locale
): Promise<void> {
  const channel = (await readChannels(site.id)).find(
    (candidate) => candidate.id === id
  );
  if (!channel) throw new RangeError("Unknown notification channel");

  const siteName = site.cname || site.code;
  await send(channel, {
    event: "test",
    site: siteName,
    text: translate(locale, "notifications.testText", { site: siteName }),
  });
}

/** The message text for one due period, or null when an alert does not fire. */
async function buildMessage(
  channel: StoredChannel,
  kind: "alert" | "summary",
  site: Site,
  period: ReportPeriod,
  settings: unknown
): Promise<string | null> {
  if (kind === "alert") {
    if (!channel.alert) return null;
    const alert = await buildTrafficAlert(
      channel.createdBy,
      channel.alert,
      site.id,
      period,
      settings
    );
    return alert
      ? [
          translate(alert.locale, "email.trafficSubject", {
            site: alert.siteName,
          }),
          alert.headline,
          alert.counts,
        ]
          .filter(Boolean)
          .join("\n")
      : null;
  }

  if (!channel.summary) return null;
  const locale = await recipientLocale(channel.createdBy, settings);
  const report = await buildReport(
    channel.summary,
    period,
    site,
    settings,
    locale
  );
  const publicUrl = getPublicUrl();
  return publicUrl
    ? `${report.subject}\n${publicUrl}/dashboard?site=${site.id}`
    : report.subject;
}

async function updateChannel(
  siteId: number,
  id: string,
  update: (channel: StoredChannel) => StoredChannel
): Promise<void> {
  await updateDurableJson(siteKey(siteId), (value) =>
    parseChannels(value).map((channel) =>
      channel.id === id ? update(channel) : channel
    )
  );
}

/**
 * Deliver one channel's due alert or summary through the shared delivery
 * ledger: one lease per job, at most one success per period, and bounded
 * retries with backoff after a failed request.
 */
async function deliverDue(
  site: Site,
  channel: StoredChannel,
  kind: "alert" | "summary",
  settings: unknown,
  localNow: Date,
  now: Date,
  assertSchedulerValid: () => Promise<void>
): Promise<void> {
  const frequency =
    kind === "alert" ? channel.alert && "daily" : channel.summary;
  const lastKey =
    kind === "alert" ? channel.alertPeriodKey : channel.summaryPeriodKey;
  if (!frequency || !isReportDue(frequency, localNow, lastKey)) return;

  const recipient = recipientKey(channel);
  const configuration = [site.id, kind === "alert" ? channel.alert : frequency];
  const period = await selectDeliveryPeriod(
    recipient,
    kind,
    configuration,
    frequency,
    localNow
  );
  const identity = deliveryIdentity([
    recipient,
    kind,
    configuration,
    period.key,
  ]);
  const outcome = await runDeliveryJob(
    recipient,
    identity,
    async (assertJobValid) => {
      const message = await buildMessage(channel, kind, site, period, settings);
      if (message === null) return false;

      // A channel deleted while the report was built must not receive it.
      if (
        !(await readChannels(site.id)).some((entry) => entry.id === channel.id)
      )
        throw new Error("Notification channel deleted");
      await assertSchedulerValid();
      await assertJobValid();
      await send(channel, {
        event: kind,
        site: site.cname || site.code,
        text: message,
      });
    }
  );
  if (outcome === "deferred") return;

  // ponytail: one failure marker per channel, cleared by either kind's
  // success. Ceiling: a summary sent right after a failed alert hides that
  // failure on the page; the ledger still retries the alert.
  await updateChannel(site.id, channel.id, (latest) => ({
    ...latest,
    [kind === "alert" ? "alertPeriodKey" : "summaryPeriodKey"]: period.key,
    lastFailureAt: null,
    lastSentAt: outcome === "sent" ? now.toISOString() : latest.lastSentAt,
  }));
}

let currentRun: Promise<void> | null = null;
let stopping = false;

async function runDueChannelMessages(now: Date): Promise<void> {
  const lease = await acquireDeliveryLease("notification-scheduler");
  if (!lease) return;

  const deadline = Date.now() + RUN_BUDGET_MS;
  const schedulerLease = lease;
  async function assertReadyToSend(): Promise<void> {
    if (Date.now() >= deadline) throw new Error("Scheduler deadline reached");
    await schedulerLease.assertValid();
  }

  try {
    const [me, sites] = await Promise.all([getMe(), getSites()]);
    const { timezone } = toDisplayPreferences(me.user.settings);
    const localNow = wallClockNow(timezone, now);

    // ponytail: walks every site and channel each run, with no cursor like
    // the email scheduler's. Ceiling: about 10 GoatCounter calls per due
    // message inside the 8-minute budget; add a cursor past a few hundred
    // channels.
    for (const site of sites) {
      for (const channel of await readChannels(site.id)) {
        for (const kind of ["alert", "summary"] as const) {
          if (Date.now() >= deadline || stopping) return;
          await lease.assertValid();
          try {
            await deliverDue(
              site,
              channel,
              kind,
              me.user.settings,
              localNow,
              now,
              assertReadyToSend
            );
          } catch (cause) {
            await updateChannel(site.id, channel.id, (latest) => ({
              ...latest,
              lastFailureAt: now.toISOString(),
            }));
            console.error(
              `notification channels: ${kind} for channel ${channel.id} failed:`,
              // Webhook errors never carry the URL or token; see postWebhook.
              cause instanceof Error ? cause.message : "unknown error"
            );
          }
        }
      }
    }
  } finally {
    await lease.release();
  }
}

/** Run due deliveries once; overlapping calls in one process share a run. */
export async function sendDueChannelMessages(
  now: Date = new Date()
): Promise<void> {
  if (currentRun || stopping) return;

  currentRun = runDueChannelMessages(now).finally(() => {
    currentRun = null;
  });
  return currentRun;
}

const SCHEDULER_KEY = Symbol.for("gtcd.notificationChannelScheduler");
const holder = globalThis as typeof globalThis & {
  [SCHEDULER_KEY]?: ReturnType<typeof setInterval>;
};

/** Stop ticking and wait for the message in flight to finish. */
export async function stopChannelScheduler(): Promise<void> {
  stopping = true;
  clearInterval(holder[SCHEDULER_KEY]);
  delete holder[SCHEDULER_KEY];

  // A failed run was already logged by its tick.
  await currentRun?.catch(() => {});
}

/** Start the delivery tick once per process (dev reloads reuse the timer). */
export function startChannelScheduler(): void {
  if (holder[SCHEDULER_KEY]) return;

  const tick = () => {
    sendDueChannelMessages().catch((cause: unknown) => {
      console.error(
        "notification channels:",
        cause instanceof Error ? cause.message : cause
      );
    });
  };

  holder[SCHEDULER_KEY] = setInterval(tick, TICK_MS);
  holder[SCHEDULER_KEY].unref?.();
  setTimeout(tick, 60_000).unref?.();
}
