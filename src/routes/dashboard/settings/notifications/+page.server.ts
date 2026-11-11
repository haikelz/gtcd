import { fail } from "@sveltejs/kit";
import {
  type MessageKey,
  type MessageParams,
  translate,
} from "$lib/i18n/index.js";
import { isReportFrequency } from "$lib/report-period.js";
import { recordAudit } from "$lib/server/audit-log.js";
import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import { DurableStateUnavailable } from "$lib/server/durable-state.js";
import { getDashboardSiteContext } from "$lib/server/goatcounter/site-context.js";
import {
  addChannel,
  ChannelLimitReached,
  type ChannelView,
  deleteChannel,
  isChannelType,
  listChannels,
  sendTestMessage,
} from "$lib/server/notification-channels.js";
import { WebhookFailed, WebhookRefused } from "$lib/server/webhook-request.js";
import type { TargetProblem } from "$lib/server/webhook-target.js";
import { parseTrafficAlertRule } from "$lib/traffic-alert.js";
import type { Actions, PageServerLoad } from "./$types";

const PROBLEM_KEYS = {
  credentials: "notifications.urlCredentials",
  invalid: "notifications.urlInvalid",
  private: "notifications.urlPrivate",
  protocol: "notifications.urlProtocol",
  unresolved: "notifications.urlUnresolved",
} as const satisfies Record<TargetProblem, MessageKey>;

const CHANNEL_ID = /^[A-Za-z0-9]{24}$/;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export const load: PageServerLoad = async ({ locals, url }) => {
  requireDashboardAdmin(locals.user);

  const { site } = await getDashboardSiteContext(url);
  try {
    return { channels: await listChannels(site.id), unavailable: false };
  } catch (cause) {
    if (!(cause instanceof DurableStateUnavailable)) throw cause;
    return { channels: [] as ChannelView[], unavailable: true };
  }
};

export const actions: Actions = {
  add: async ({ locals, request }) => {
    const admin = requireDashboardAdmin(locals.user);

    const form = await request.formData();
    const type = form.get("type");
    const label = field(form, "label").trim();
    const wantsAlerts = form.get("alerts") === "on";
    const wantsSummaries = form.get("summaries") === "on";
    const alert = wantsAlerts
      ? parseTrafficAlertRule({
          direction: form.get("direction"),
          minimum: Number(form.get("minimum")),
          threshold: Number(form.get("threshold")),
        })
      : null;
    const frequency = form.get("frequency");
    const summary =
      wantsSummaries && isReportFrequency(frequency) && frequency !== "never"
        ? frequency
        : null;
    const invalid = (key: MessageKey) =>
      fail(400, { action: "add", message: translate(locals.locale, key) });
    if (!isChannelType(type)) return invalid("notifications.invalid");
    if (!label || label.length > 80)
      return invalid("notifications.nameInvalid");
    if (!wantsAlerts && !wantsSummaries)
      return invalid("notifications.receivesInvalid");
    if ((wantsAlerts && !alert) || (wantsSummaries && !summary))
      return invalid("notifications.invalid");

    const { site } = await getDashboardSiteContext(new URL(request.url));
    const audit = {
      action: "channel.add",
      actor: admin.email,
      site: site.id,
      target: `${type}: ${label}`,
    };
    try {
      await addChannel(
        site.id,
        {
          alert,
          chatId: field(form, "chatId"),
          label,
          secret: field(form, type === "telegram" ? "botToken" : "url"),
          summary,
          type,
        },
        admin.email
      );
    } catch (cause) {
      await recordAudit({ ...audit, outcome: "failure" });
      if (cause instanceof WebhookRefused)
        return invalid(PROBLEM_KEYS[cause.problem]);
      if (cause instanceof ChannelLimitReached)
        return invalid("notifications.limit");
      if (cause instanceof RangeError)
        return invalid(
          type === "telegram"
            ? "notifications.telegramInvalid"
            : "notifications.invalid"
        );
      return fail(503, {
        action: "add",
        message: translate(locals.locale, "notifications.saveFailed"),
      });
    }

    await recordAudit({ ...audit, outcome: "success" });
    return {
      action: "add",
      message: translate(locals.locale, "notifications.added"),
    };
  },
  delete: async ({ locals, request }) => {
    const admin = requireDashboardAdmin(locals.user);

    const id = (await request.formData()).get("id");
    if (typeof id !== "string" || !CHANNEL_ID.test(id))
      return fail(404, {
        action: "delete",
        message: translate(locals.locale, "notifications.notFound"),
      });

    const { site } = await getDashboardSiteContext(new URL(request.url));
    let removed: ChannelView;
    try {
      removed = await deleteChannel(site.id, id);
    } catch (cause) {
      await recordAudit({
        action: "channel.delete",
        actor: admin.email,
        outcome: "failure",
        site: site.id,
        target: id,
      });
      return fail(cause instanceof RangeError ? 404 : 503, {
        action: "delete",
        message: translate(
          locals.locale,
          cause instanceof RangeError
            ? "notifications.notFound"
            : "notifications.saveFailed"
        ),
      });
    }

    await recordAudit({
      action: "channel.delete",
      actor: admin.email,
      outcome: "success",
      site: site.id,
      target: `${removed.type}: ${removed.label}`,
    });
    return {
      action: "delete",
      message: translate(locals.locale, "notifications.deleted"),
    };
  },
  test: async ({ locals, request }) => {
    requireDashboardAdmin(locals.user);

    const id = (await request.formData()).get("id");
    const failure = (status: number, key: MessageKey, params?: MessageParams) =>
      fail(status, {
        action: "test",
        message: translate(locals.locale, key, params),
      });
    if (typeof id !== "string" || !CHANNEL_ID.test(id))
      return failure(404, "notifications.notFound");

    const { site } = await getDashboardSiteContext(new URL(request.url));
    try {
      await sendTestMessage(site, id, locals.locale);
    } catch (cause) {
      if (cause instanceof WebhookRefused)
        return failure(400, PROBLEM_KEYS[cause.problem]);
      if (cause instanceof WebhookFailed)
        return cause.status === null
          ? failure(502, "notifications.testFailed")
          : failure(502, "notifications.testRefused", {
              status: cause.status,
            });
      if (cause instanceof RangeError)
        return failure(404, "notifications.notFound");
      if (cause instanceof DurableStateUnavailable)
        return failure(503, "notifications.unavailable");
      throw cause;
    }

    return {
      action: "test",
      message: translate(locals.locale, "notifications.testSent"),
    };
  },
};
