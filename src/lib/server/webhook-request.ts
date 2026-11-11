import { lookup, type LookupAddress } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import { env } from "$env/dynamic/private";
import {
  checkWebhookUrl,
  isBlockedAddress,
  isIpLiteral,
  parseAllowedHosts,
  type TargetProblem,
} from "$lib/server/webhook-target.js";

const TIMEOUT_MS = 10_000;
const RESPONSE_LIMIT_BYTES = 64 * 1024;

/** gtcd refused the target itself; nothing was sent. */
export class WebhookRefused extends Error {
  readonly problem: TargetProblem;

  constructor(problem: TargetProblem) {
    super(`Webhook target refused: ${problem}`);
    this.name = "WebhookRefused";
    this.problem = problem;
  }
}

/** The receiver answered with a non-2xx status, or never answered (null). */
export class WebhookFailed extends Error {
  readonly status: number | null;

  constructor(status: number | null) {
    super(
      status === null
        ? "Webhook request failed"
        : `Webhook answered HTTP ${status}`
    );
    this.name = "WebhookFailed";
    this.status = status;
  }
}

function allowedHosts(): Set<string> {
  return parseAllowedHosts(
    env.GTCD_ALLOWED_WEBHOOKS ?? process.env.GTCD_ALLOWED_WEBHOOKS
  );
}

function checkedTarget(value: string): { trusted: boolean; url: URL } {
  const target = checkWebhookUrl(value, allowedHosts());
  if ("problem" in target) throw new WebhookRefused(target.problem);

  return target;
}

function refusesAny(addresses: readonly LookupAddress[]): boolean {
  return (
    addresses.length === 0 ||
    addresses.some((entry) => isBlockedAddress(entry.address))
  );
}

/**
 * Resolve, refuse private answers, and hand the socket exactly the addresses
 * that passed. The check and the connection share one DNS answer, so a
 * rebinding record cannot swap in a private address between them.
 */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "");
    if (refusesAny(addresses))
      return callback(new WebhookRefused("private"), "");
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

/** Validate an admin-entered URL now, including where its host resolves. */
export async function checkWebhookTarget(value: string): Promise<void> {
  const { trusted, url } = checkedTarget(value);
  if (trusted || isIpLiteral(url.hostname)) return;

  let addresses: LookupAddress[];
  try {
    addresses = await new Promise((resolve, reject) =>
      lookup(url.hostname, { all: true }, (error, found) =>
        error ? reject(error) : resolve(found)
      )
    );
  } catch {
    throw new WebhookRefused("unresolved");
  }
  if (refusesAny(addresses)) throw new WebhookRefused("private");
}

/**
 * POST a JSON body to a checked target. Redirects are failures (following
 * one would leave the checked host), the whole exchange is capped at 10s, and
 * at most 64 KiB of the answer is read.
 */
export async function postWebhook(value: string, body: string): Promise<void> {
  const { trusted, url } = checkedTarget(value);
  const send = url.protocol === "https:" ? httpsRequest : httpRequest;

  await new Promise<void>((resolve, reject) => {
    const outgoing = send(
      url,
      {
        agent: false,
        headers: {
          "content-length": Buffer.byteLength(body),
          "content-type": "application/json",
          "user-agent": "gtcd-notifications",
        },
        method: "POST",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        // ponytail: allowlisted hosts use plain DNS with no address check.
        // Ceiling: whoever controls an allowlisted name's DNS chooses where
        // gtcd connects; pin allowlist entries to CIDRs if that matters.
        ...(trusted ? {} : { lookup: guardedLookup }),
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 200 && status < 300) resolve();
        else reject(new WebhookFailed(status));

        let received = 0;
        response.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > RESPONSE_LIMIT_BYTES) response.destroy();
        });
        response.on("error", () => {});
      }
    );
    // Node's messages name the address; callers only ever see the category.
    outgoing.on("error", (cause) =>
      reject(cause instanceof WebhookRefused ? cause : new WebhookFailed(null))
    );
    outgoing.end(body);
  });
}
