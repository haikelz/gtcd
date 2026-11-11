// No imports: webhook-target.check.ts runs this file directly with
// node --experimental-strip-types.

export const CHANNEL_TYPES = [
  "slack",
  "discord",
  "telegram",
  "webhook",
] as const;

export type ChannelType = (typeof CHANNEL_TYPES)[number];

export type TargetProblem =
  "credentials" | "invalid" | "private" | "protocol" | "unresolved";

export type WebhookTarget =
  | { readonly trusted: boolean; readonly url: URL }
  | { readonly problem: TargetProblem };

export type ChannelEvent = {
  readonly event: "alert" | "summary" | "test";
  readonly site: string;
  readonly text: string;
};

// Loopback, private, link-local (169.254.169.254 metadata included), CGNAT,
// multicast, documentation, benchmarking and reserved ranges. 168.63.129.16
// is Azure's host endpoint, reachable from every Azure VM.
const BLOCKED_IPV4: readonly (readonly [string, number])[] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["168.63.129.16", 32],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const MAX_URL_LENGTH = 2048;
const DISCORD_CONTENT_LIMIT = 2000;
const TELEGRAM_TEXT_LIMIT = 4096;

/** Canonical dotted decimal only; anything else is not an address. */
function parseIpv4(value: string): number | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;

  let address = 0;
  for (const part of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255) return null;
    address = address * 256 + Number(part);
  }
  return address;
}

function parseIpv6(value: string): number[] | null {
  let text = value.toLowerCase();

  const dotted = /^(.*:)(\d+\.\d+\.\d+\.\d+)$/.exec(text);
  if (dotted) {
    const ipv4 = parseIpv4(dotted[2]);
    if (ipv4 === null) return null;
    text = `${dotted[1]}${(ipv4 >>> 16).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }

  const halves = text.split("::");
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;

  const groups = [
    ...head,
    ...Array<string>(halves.length === 2 ? missing : 0).fill("0"),
    ...tail,
  ];
  if (!groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) return null;

  return groups.map((group) => parseInt(group, 16));
}

const BLOCKED_IPV4_RANGES = BLOCKED_IPV4.map(([base, bits]) => ({
  size: 2 ** (32 - bits),
  start: parseIpv4(base) ?? 0,
}));

function isBlockedIpv4(address: number): boolean {
  return BLOCKED_IPV4_RANGES.some(
    ({ size, start }) => Math.floor(address / size) === start / size
  );
}

function isBlockedIpv6(groups: readonly number[]): boolean {
  const [first, second] = groups;
  const zeros = (count: number) =>
    groups.slice(0, count).every((group) => group === 0);
  const embedded = (high: number, low: number) =>
    isBlockedIpv4(high * 65_536 + low);

  // ::/96 holds ::, ::1 and the deprecated IPv4-compatible form.
  if (zeros(6)) return true;
  // IPv4-mapped ::ffff:0:0/96 and IPv4-translated ::ffff:0:0:0/96.
  if (zeros(5) && groups[5] === 0xffff) return embedded(groups[6], groups[7]);
  if (zeros(4) && groups[4] === 0xffff && groups[5] === 0)
    return embedded(groups[6], groups[7]);
  // NAT64 64:ff9b::/96 maps an IPv4 address; 64:ff9b:1::/48 is local use.
  if (first === 0x64 && second === 0xff9b) {
    return groups.slice(2, 6).every((group) => group === 0)
      ? embedded(groups[6], groups[7])
      : groups[2] === 1;
  }
  // 6to4 2002::/16 embeds an IPv4 address in the next 32 bits.
  if (first === 0x2002) return embedded(second, groups[2]);
  // Teredo 2001::/32 tunnels to an obfuscated IPv4 address.
  if (first === 0x2001 && second === 0) return true;
  // Documentation 2001:db8::/32 and discard-only 100::/64.
  if (first === 0x2001 && second === 0xdb8) return true;
  if (first === 0x100 && groups.slice(1, 4).every((group) => group === 0))
    return true;

  return (
    (first & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (first & 0xffc0) === 0xfe80 || // link-local fe80::/10
    (first & 0xffc0) === 0xfec0 || // site-local fec0::/10
    (first & 0xff00) === 0xff00 // multicast ff00::/8
  );
}

/**
 * Whether gtcd must refuse to connect to this IP address. Anything that is
 * not a canonical IPv4 or IPv6 address counts as blocked.
 */
export function isBlockedAddress(address: string): boolean {
  const unbracketed = address.replace(/^\[(.*)\]$/, "$1").replace(/%.*$/, "");

  if (unbracketed.includes(":")) {
    const groups = parseIpv6(unbracketed);
    return groups === null || isBlockedIpv6(groups);
  }

  const ipv4 = parseIpv4(unbracketed);
  return ipv4 === null || isBlockedIpv4(ipv4);
}

/** Whether a URL hostname is an IP literal (WHATWG URLs canonicalize IPv4). */
export function isIpLiteral(hostname: string): boolean {
  return hostname.startsWith("[") || parseIpv4(hostname) !== null;
}

/** Host names from the operator allowlist, normalized like URL hostnames. */
export function parseAllowedHosts(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(/[\s,]+/)
      .map((entry) => entry.trim().toLowerCase().replace(/\.$/, ""))
      .filter(Boolean)
      .map((entry) =>
        entry.includes(":") && !entry.startsWith("[") ? `[${entry}]` : entry
      )
  );
}

/**
 * Check a webhook URL before any DNS lookup. Allowlisted hosts skip the
 * address check and may use http, for internal receivers the operator trusts.
 */
export function checkWebhookUrl(
  value: string,
  allowedHosts: ReadonlySet<string>
): WebhookTarget {
  if (!value || value.length > MAX_URL_LENGTH) return { problem: "invalid" };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { problem: "invalid" };
  }
  if (!url.hostname) return { problem: "invalid" };

  const trusted = allowedHosts.has(url.hostname.replace(/\.$/, ""));
  if (url.protocol !== "https:" && !(trusted && url.protocol === "http:"))
    return { problem: "protocol" };
  if (url.username || url.password) return { problem: "credentials" };
  if (!trusted && isIpLiteral(url.hostname) && isBlockedAddress(url.hostname))
    return { problem: "private" };

  return { trusted, url };
}

/** Telegram bot tokens look like 123456789:AAH...; chats are ids or @names. */
export function isTelegramTarget(token: string, chatId: string): boolean {
  return (
    /^\d{1,20}:[A-Za-z0-9_-]{20,100}$/.test(token) &&
    /^(-?\d{1,20}|@[A-Za-z][A-Za-z0-9_]{4,31})$/.test(chatId)
  );
}

/** The URL and JSON body one channel type expects for a message. */
export function channelRequest(
  channel: {
    readonly chatId: string | null;
    readonly secret: string;
    readonly type: ChannelType;
  },
  message: ChannelEvent
): { readonly body: string; readonly url: string } {
  switch (channel.type) {
    case "slack":
      return {
        body: JSON.stringify({ text: message.text }),
        url: channel.secret,
      };
    case "discord":
      return {
        body: JSON.stringify({
          allowed_mentions: { parse: [] },
          content: message.text.slice(0, DISCORD_CONTENT_LIMIT),
        }),
        url: channel.secret,
      };
    case "telegram":
      return {
        body: JSON.stringify({
          chat_id: channel.chatId,
          disable_web_page_preview: true,
          text: message.text.slice(0, TELEGRAM_TEXT_LIMIT),
        }),
        url: `https://api.telegram.org/bot${channel.secret}/sendMessage`,
      };
    case "webhook":
      return {
        body: JSON.stringify(message),
        url: channel.secret,
      };
  }
}

/** A recognizable but unusable form of a saved webhook URL or bot token. */
export function maskSecret(type: ChannelType, secret: string): string {
  const masked = (value: string) =>
    `••••${value.length > 16 ? value.slice(-4) : ""}`;
  if (type === "telegram") return masked(secret);

  try {
    const url = new URL(secret);
    return `${url.origin}/${masked(url.pathname + url.search)}`;
  } catch {
    return masked("");
  }
}
