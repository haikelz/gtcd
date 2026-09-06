import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

// There is no public landing page: home always resolves to the app.
export const load: PageServerLoad = async ({ locals }) => {
  throw redirect(302, locals.user ? "/dashboard" : "/login");
};
