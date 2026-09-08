import { getPaths } from "$lib/server/goatcounter/stats.js";

function parseAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) throw new Error("Choose a valid path page.");

  const after = Number(value);
  if (!Number.isSafeInteger(after) || after < 1) {
    throw new Error("Choose a valid path page.");
  }

  return after;
}

export async function load({ url }) {
  const after = parseAfter(url.searchParams.get("after"));

  try {
    const result = await getPaths(100, after);
    const nextAfter = result.paths.at(-1)?.id;
    return { after, nextAfter, paths: result };
  } catch (cause: unknown) {
    return {
      after,
      nextAfter: undefined,
      paths: null,
      error: cause instanceof Error ? cause.message : "Failed to load paths.",
    };
  }
}
