import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    authenticated: !!locals.user,
    user: locals.user,
  };
};
