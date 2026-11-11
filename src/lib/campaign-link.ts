/**
 * Campaign links for GoatCounter. Import-free so
 * `node --experimental-strip-types src/lib/campaign-link.check.ts` can run it.
 */

export type CampaignLinkInput = {
  readonly campaign: string;
  readonly content: string;
  readonly medium: string;
  readonly source: string;
  readonly term: string;
  readonly url: string;
};

export type CampaignLinkField = "campaign" | "source" | "url";

export type CampaignLink =
  { readonly url: string } | { readonly invalid: readonly CampaignLinkField[] };

const TAGS = [
  ["utm_source", "source"],
  ["utm_medium", "medium"],
  ["utm_campaign", "campaign"],
  ["utm_term", "term"],
  ["utm_content", "content"],
] as const;

const TAG_KEYS: ReadonlySet<string> = new Set(TAGS.map(([key]) => key));

function parseWebUrl(value: string): URL | undefined {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The page URL tagged with the filled-in utm_* values, which replace any the
 * URL already carries. Other query parameters and the hash stay as written.
 */
export function buildCampaignUrl(input: CampaignLinkInput): CampaignLink {
  const url = parseWebUrl(input.url);
  const invalid: CampaignLinkField[] = [];
  if (!url) invalid.push("url");
  if (!input.source.trim()) invalid.push("source");
  if (!input.campaign.trim()) invalid.push("campaign");
  if (!url || invalid.length > 0) return { invalid };

  // ponytail: matches keys as written, so a percent-encoded "utm%5Fsource"
  // survives; decoding every key would also re-encode the parameters kept.
  const kept = url.search
    .slice(1)
    .split("&")
    .filter((pair) => pair && !TAG_KEYS.has(pair.split("=", 1)[0]));
  const tags = TAGS.flatMap(([key, field]) => {
    const value = input[field].trim();
    return value ? [`${key}=${encodeURIComponent(value)}`] : [];
  });
  url.search = [...kept, ...tags].join("&");

  return { url: url.href };
}
