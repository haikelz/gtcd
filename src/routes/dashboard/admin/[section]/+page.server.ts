import { error, fail, redirect } from "@sveltejs/kit";
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

function authorize(
  user: App.Locals["user"],
  section: string
): { email: string; section: NativeSection } {
  if (!user) throw redirect(303, "/login");
  if (!isNativeSection(section))
    throw error(404, "Administration page not found.");
  if (!["security", "preferences"].includes(section))
    requireDashboardAdmin(user);
  return { email: user.email, section };
}

function feedback(cause: unknown) {
  if (!(cause instanceof NativeAdminError)) throw cause;
  const messages = {
    reauthenticate:
      "Your GoatCounter session has expired. Sign out and sign in again to continue.",
    denied:
      "Your GoatCounter account does not have permission to make this change.",
    unavailable:
      "GoatCounter could not complete the request. Check the current state before trying again.",
    invalid:
      "The form is no longer valid. Reload this page, check your entries and confirm the action again. Import files must be CSV or CSV.gz, up to 8 MB.",
  };
  return {
    message: messages[cause.code],
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
  const account = authorize(locals.user, params.section);
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
      problem: feedback(cause),
    };
  }
};

export const actions: Actions = {
  default: async ({ cookies, locals, params, url, request }) => {
    const account = authorize(locals.user, params.section);
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
      return fail(cause.status, { problem: feedback(cause) });
    }
  },
};
