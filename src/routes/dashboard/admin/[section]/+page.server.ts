import { error, fail, redirect } from "@sveltejs/kit";
import type { Locale } from "$lib/dashboard-layout";
import { type MessageKey, translate } from "$lib/i18n";
import {
  requireDashboardAdmin,
  isDashboardAdmin,
} from "$lib/server/auth/admin.js";
import { getDashboardSiteContext } from "$lib/server/goatcounter/site-context.js";
import {
  isNativeSection,
  loadNativeAdmin,
  submitNativeAdmin,
  revealNativeToken,
} from "$lib/server/goatcounter/native-admin.js";
import { NativeAdminError } from "$lib/server/goatcounter/native-session.js";
import type { NativeSection } from "$lib/native-admin.js";
import type { Actions, PageServerLoad } from "./$types";

const PROBLEM_KEYS = {
  denied: "admin.problemDenied",
  invalid: "admin.problemInvalid",
  reauthenticate: "admin.problemReauthenticate",
  unavailable: "admin.problemUnavailable",
} as const satisfies Record<NativeAdminError["code"], MessageKey>;

function authorize(
  locals: App.Locals,
  section: string
): { email: string; section: NativeSection } {
  if (!locals.user) throw redirect(303, "/login");
  if (!isNativeSection(section))
    throw error(404, translate(locals.locale, "admin.notFound"));
  if (!["security", "preferences"].includes(section))
    requireDashboardAdmin(locals.user);
  return { email: locals.user.email, section };
}

function feedback(cause: unknown, locale: Locale) {
  if (!(cause instanceof NativeAdminError)) throw cause;
  return {
    message: translate(locale, PROBLEM_KEYS[cause.code]),
    reconnect: cause.code === "reauthenticate",
    status: cause.status,
  };
}

export const load: PageServerLoad = async ({
  cookies,
  locals,
  params,
  url,
}) => {
  const account = authorize(locals, params.section);
  const context = await getDashboardSiteContext(url);
  try {
    return {
      section: account.section,
      canAdminister: isDashboardAdmin(account.email),
      nativePage: await loadNativeAdmin(
        cookies,
        account.email,
        account.section,
        url,
        context.vhost
      ),
      problem: null,
    };
  } catch (cause) {
    return {
      section: account.section,
      canAdminister: isDashboardAdmin(account.email),
      nativePage: null,
      problem: feedback(cause, locals.locale),
    };
  }
};

export const actions: Actions = {
  default: async ({ cookies, locals, params, url, request }) => {
    const account = authorize(locals, params.section);
    const context = await getDashboardSiteContext(url);
    const submitted = await request.formData();
    try {
      if (submitted.get("__reveal")) {
        if (account.section !== "tokens")
          throw new NativeAdminError(400, "invalid");
        return {
          token: await revealNativeToken(
            cookies,
            account.email,
            String(submitted.get("__reveal")),
            context.vhost
          ),
          tokenId: String(submitted.get("__reveal")),
        };
      }
      const result = await submitNativeAdmin(
        cookies,
        account.email,
        account.section,
        url,
        submitted,
        context.vhost
      );
      if (
        account.section === "users" &&
        !result.page.messages.some((message) => message.error)
      ) {
        const resource = result.path.match(
          /^\/settings\/users\/(add|[1-9]\d*)$/
        )?.[1];
        if ((url.searchParams.get("resource") ?? undefined) !== resource) {
          const target = new URL(url);
          if (resource) target.searchParams.set("resource", resource);
          else target.searchParams.delete("resource");
          throw redirect(303, target.pathname + target.search);
        }
      }
      return { nativePage: result.page };
    } catch (cause) {
      if (!(cause instanceof NativeAdminError)) throw cause;
      return fail(cause.status, { problem: feedback(cause, locals.locale) });
    }
  },
};
