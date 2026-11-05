// No $lib imports: upstream-fetch.check.ts runs this file directly with
// node --experimental-strip-types.
import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

/**
 * fetch() that honors a Host header. Node's fetch drops a custom Host (a
 * forbidden header in the Fetch spec) and GoatCounter picks the site by Host,
 * so a request naming a different vhost goes through node:http instead.
 *
 * ponytail: the node:http path never follows redirects, like
 * `redirect: "manual"`; GoatCounter's API does not redirect, and the login
 * forms already ask for manual redirects. If a caller ever needs "follow",
 * re-issue the request to the Location header here.
 */
export async function upstreamFetch(
  input: string | URL,
  init: RequestInit = {}
): Promise<Response> {
  const url = new URL(input);
  const headers = new Headers(init.headers);
  const host = headers.get("host");
  if (!host || host === url.host) return fetch(url, init);

  headers.delete("host");
  // Request encodes the body (string, URLSearchParams, FormData) and sets its
  // content type the way fetch would.
  const request = new Request(url, { ...init, headers, redirect: "manual" });
  const body = request.body
    ? Buffer.from(await request.arrayBuffer())
    : undefined;
  const outgoing: Record<string, string> = Object.fromEntries(request.headers);
  outgoing.host = host;
  if (body) outgoing["content-length"] = String(body.length);

  const signal = init.signal ?? undefined;
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      { headers: outgoing, method: request.method, signal },
      (res) => {
        const responseHeaders = new Headers();
        for (let i = 0; i < res.rawHeaders.length; i += 2) {
          responseHeaders.append(res.rawHeaders[i], res.rawHeaders[i + 1]);
        }

        const status = res.statusCode ?? 502;
        const hasBody =
          !NULL_BODY_STATUSES.has(status) && request.method !== "HEAD";
        if (!hasBody) res.resume();
        resolve(
          new Response(
            hasBody
              ? (Readable.toWeb(res) as ReadableStream<Uint8Array>)
              : null,
            { headers: responseHeaders, status, statusText: res.statusMessage }
          )
        );
      }
    );

    // Reject like fetch: the signal's reason on abort (a TimeoutError), else a
    // TypeError carrying the socket error. Callers classify both, and the raw
    // message names the internal address, so it must not surface as-is.
    req.on("error", (error) =>
      reject(
        signal?.aborted
          ? signal.reason
          : new TypeError("fetch failed", { cause: error })
      )
    );
    req.end(body);
  });
}
