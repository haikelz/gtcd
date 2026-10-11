import type { Locale } from "$lib/dashboard-layout";
import { translate } from "$lib/i18n";
import { getPaths } from "$lib/server/goatcounter/stats.js";

function parseAfter(value: string | null, locale: Locale): number | undefined {
  if (!value) return undefined;
  if (!/^\d+$/.test(value))
    throw new Error(translate(locale, "reports.pathsInvalidPage"));

  const after = Number(value);
  if (!Number.isSafeInteger(after) || after < 1) {
    throw new Error(translate(locale, "reports.pathsInvalidPage"));
  }

  return after;
}

export async function load({ locals, url, parent }) {
  const after = parseAfter(url.searchParams.get("after"), locals.locale);
  const { vhost } = await parent();

  try {
    const result = await getPaths(100, after, { vhost });
    const nextAfter = result.paths.at(-1)?.id;
    return { after, nextAfter, paths: result };
  } catch (cause: unknown) {
    return {
      after,
      nextAfter: undefined,
      paths: null,
      error:
        cause instanceof Error
          ? cause.message
          : translate(locals.locale, "reports.pathsLoadFailed"),
    };
  }
}
