import { fail, redirect } from "@sveltejs/kit";
import {
  type DashboardLayout,
  DEFAULT_DASHBOARD_LAYOUT,
  isWidgetId,
  MAX_SAVED_VIEWS,
  normalizeWidgets,
  sanitizeViewName,
  sanitizeViewQuery,
} from "$lib/dashboard-layout.js";
import {
  getDashboardLayout,
  saveDashboardLayout,
} from "$lib/server/dashboard-layout-store.js";

/** Only return to dashboard report routes after saving a view. */
function safeReturnPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;

  return /^\/dashboard(\/[a-z0-9/_-]*)?$/i.test(value) ? value : null;
}

function requireEmail(locals: App.Locals): string {
  if (!locals.user) throw redirect(302, "/login");

  return locals.user.email;
}

export function load({ url }) {
  const save = url.searchParams.get("save");

  return {
    returnTo: safeReturnPath(url.searchParams.get("from")),
    saveQuery: save === null ? null : sanitizeViewQuery(save),
  };
}

export const actions = {
  saveView: async ({ locals, request }) => {
    const email = requireEmail(locals);
    const formData = await request.formData();
    const name = sanitizeViewName(formData.get("name"));
    const rawQuery = formData.get("query");
    const query =
      typeof rawQuery === "string" ? sanitizeViewQuery(rawQuery) : "";
    const makeDefault = formData.get("makeDefault") === "on";
    const returnTo = safeReturnPath(formData.get("returnTo"));

    if (!name) {
      return fail(400, {
        action: "saveView",
        message: "Give the view a name of up to 40 characters.",
      });
    }

    const layout = await getDashboardLayout(email);
    const others = layout.views.filter((view) => view.name !== name);
    if (others.length >= MAX_SAVED_VIEWS) {
      return fail(400, {
        action: "saveView",
        message: `You can keep up to ${MAX_SAVED_VIEWS} views. Delete one first.`,
      });
    }

    await saveDashboardLayout(email, {
      ...layout,
      defaultView: makeDefault ? name : layout.defaultView,
      views: [...others, { name, query }],
    });

    if (returnTo) {
      const target = new URLSearchParams(query);
      const site = formData.get("site");
      if (typeof site === "string" && /^\d+$/.test(site)) {
        target.set("site", site);
      }
      const search = target.toString();
      throw redirect(303, search ? `${returnTo}?${search}` : returnTo);
    }

    return { action: "saveView", message: `Saved “${name}”.` };
  },
  deleteView: async ({ locals, request }) => {
    const email = requireEmail(locals);
    const formData = await request.formData();
    const name = sanitizeViewName(formData.get("name"));
    const layout = await getDashboardLayout(email);

    await saveDashboardLayout(email, {
      ...layout,
      defaultView: layout.defaultView === name ? null : layout.defaultView,
      views: layout.views.filter((view) => view.name !== name),
    });

    return { action: "deleteView", message: "View deleted." };
  },
  setDefaultView: async ({ locals, request }) => {
    const email = requireEmail(locals);
    const formData = await request.formData();
    const name = sanitizeViewName(formData.get("name"));
    const layout = await getDashboardLayout(email);
    const defaultView =
      name && layout.views.some((view) => view.name === name) ? name : null;

    await saveDashboardLayout(email, { ...layout, defaultView });

    return {
      action: "setDefaultView",
      message: defaultView
        ? `“${defaultView}” is now your default view.`
        : "Default view cleared.",
    };
  },
  saveWidgets: async ({ locals, request }) => {
    const email = requireEmail(locals);
    const formData = await request.formData();
    const layout = await getDashboardLayout(email);

    if (formData.get("reset") === "on") {
      await saveDashboardLayout(email, {
        ...layout,
        widgets: DEFAULT_DASHBOARD_LAYOUT.widgets,
      });
      return { action: "saveWidgets", message: "Overview layout reset." };
    }

    const hidden = new Set(formData.getAll("hidden").filter(isWidgetId));
    const order = formData.getAll("widget").filter(isWidgetId);
    const widgets: DashboardLayout["widgets"] = normalizeWidgets(
      order.map((id) => ({ hidden: hidden.has(id), id }))
    );

    if (widgets.every((widget) => widget.hidden)) {
      return fail(400, {
        action: "saveWidgets",
        message: "Keep at least one widget visible.",
      });
    }

    await saveDashboardLayout(email, { ...layout, widgets });

    return { action: "saveWidgets", message: "Overview layout saved." };
  },
};
