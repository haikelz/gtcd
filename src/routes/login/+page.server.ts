import { createDashboardSession, shouldUseSecureCookies } from "$lib/server/auth/session.js";
import { authenticateWithGoatCounter } from "$lib/server/goatcounter/auth.js";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  // If already logged in, redirect to dashboard
  if (locals.user) {
    throw redirect(302, "/dashboard");
  }
};

export const actions: Actions = {
  login: async ({ request, cookies, url }) => {
    const data = await request.formData();
    const email = data.get("email") as string;
    const password = data.get("password") as string;

    if (!email || !password) {
      return fail(400, { error: "Please enter both email and password" });
    }

    const result = await authenticateWithGoatCounter(email, password);

    if (!result.success) {
      switch (result.reason) {
        case "invalid_credentials":
          return fail(400, { error: "Invalid email or password" });
        case "mfa_required":
          return fail(400, {
            error:
              "Two-factor authentication is required. Please disable TOTP or use the GoatCounter dashboard directly.",
          });
        case "unavailable":
          return fail(502, {
            error:
              "GoatCounter is currently unavailable. Please try again later.",
          });
      }
    }

    // Authentication successful — create dashboard session
    await createDashboardSession(
      cookies,
      result.user.email,
      shouldUseSecureCookies(request.headers, url),
    );

    throw redirect(302, "/dashboard");
  },
};
