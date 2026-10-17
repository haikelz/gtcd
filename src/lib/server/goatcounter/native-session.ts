import { createHash } from "node:crypto";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { parse, type DefaultTreeAdapterMap } from "parse5";
import type { Cookies } from "@sveltejs/kit";
import { getJson, setJson, deleteKey } from "$lib/server/kv.js";
import { getBaseUrl, getVhost } from "./client.js";
import { getGoatCounterAdminUrl } from "$lib/server/auth/admin.js";

export type NativeSession = { email: string; cookies: Record<string, string> };

export class NativeAdminError extends Error {
  constructor(
    readonly status: number,
    readonly code: "reauthenticate" | "denied" | "unavailable" | "invalid"
  ) {
    super(code);
  }
}

function storageKey(cookies: Cookies): string | null {
  const id = cookies.get("dashboard_session");
  return id
    ? `native-session:${createHash("sha256").update(id).digest("hex")}`
    : null;
}

/** Native credentials never become locals, load data, browser cookies, or logs. */
export async function saveNativeSession(
  cookies: Cookies,
  session: NativeSession
): Promise<void> {
  const key = storageKey(cookies);
  if (key) await setJson(key, session, 7 * 24 * 60 * 60);
}

export async function getNativeSession(
  cookies: Cookies,
  email: string
): Promise<NativeSession> {
  const key = storageKey(cookies);
  const value = key ? await getJson(key) : undefined;
  if (
    !value ||
    typeof value !== "object" ||
    !("email" in value) ||
    value.email !== email ||
    !("cookies" in value) ||
    !value.cookies ||
    typeof value.cookies !== "object"
  ) {
    throw new NativeAdminError(401, "reauthenticate");
  }
  const jar: Record<string, string> = {};
  for (const [name, cookie] of Object.entries(value.cookies)) {
    if (
      !["key", "flash"].includes(name) ||
      typeof cookie !== "string" ||
      /[\r\n;]/.test(cookie) ||
      cookie.length > 8192
    ) {
      throw new NativeAdminError(401, "reauthenticate");
    }
    jar[name] = cookie;
  }
  if (!jar.key) throw new NativeAdminError(401, "reauthenticate");
  return { email, cookies: jar };
}

export async function forgetNativeSession(cookies: Cookies): Promise<void> {
  const key = storageKey(cookies);
  if (key) await deleteKey(key);
}

export function captureNativeCookies(
  headers: Headers,
  jar: Record<string, string> = {}
): Record<string, string> {
  for (const header of headers.getSetCookie()) {
    const [pair, ...attributes] = header.split(";");
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator).trim();
    if (!["key", "flash"].includes(name)) continue;
    const value = pair.slice(separator + 1).trim();
    const expired = attributes.some((attribute) => {
      const [key, ...rest] = attribute.trim().split("=");
      return (
        (key.toLowerCase() === "max-age" && Number(rest.join("=")) <= 0) ||
        (key.toLowerCase() === "expires" &&
          Date.parse(rest.join("=")) <= Date.now())
      );
    });
    if (!value || expired) delete jar[name];
    else if (value.length <= 8192 && !/[\r\n]/.test(value)) jar[name] = value;
  }
  return jar;
}

/** Manual redirects, no API bearer, correct Host even with an internal URL.
 * Native mutations must never be retried automatically. */
export async function nativeRequest(
  path: string,
  session: NativeSession,
  vhost?: string,
  body?: URLSearchParams | FormData
): Promise<Response> {
  if (!path.startsWith("/") || path.startsWith("//") || /[\r\n\\]/.test(path))
    throw new NativeAdminError(400, "invalid");
  const base = getBaseUrl();
  if (!base) throw new NativeAdminError(503, "unavailable");
  const url = new URL(`${base}${path}`);
  let bytes: Buffer | undefined;
  let contentType: string | undefined;
  if (body) {
    const encoded = new Request("http://localhost", { method: "POST", body });
    contentType = encoded.headers.get("content-type") ?? undefined;
    bytes = Buffer.from(await encoded.arrayBuffer());
    if (bytes.byteLength > 9 * 1024 * 1024)
      throw new NativeAdminError(413, "invalid");
  }
  const adminUrl = getGoatCounterAdminUrl();
  const host =
    vhost || getVhost() || (adminUrl ? new URL(adminUrl).host : url.host);
  try {
    const response = await new Promise<Response>((resolve, reject) => {
      const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
        url,
        {
          method: body ? "POST" : "GET",
          headers: {
            Host: host,
            Cookie: Object.entries(session.cookies)
              .map(([name, value]) => `${name}=${value}`)
              .join("; "),
            "Accept-Encoding": "identity",
            ...(bytes && contentType
              ? {
                  "Content-Type": contentType,
                  "Content-Length": String(bytes.byteLength),
                }
              : {}),
          },
          signal: AbortSignal.timeout(15_000),
        },
        (upstream) => {
          const chunks: Buffer[] = [];
          let length = 0;
          upstream.on("data", (chunk: Buffer) => {
            length += chunk.length;
            if (length > 2_000_000) {
              upstream.destroy(new Error("Response too large"));
              return;
            }
            chunks.push(chunk);
          });
          upstream.on("error", reject);
          upstream.on("end", () => {
            const headers = new Headers();
            for (let index = 0; index < upstream.rawHeaders.length; index += 2)
              headers.append(
                upstream.rawHeaders[index],
                upstream.rawHeaders[index + 1]
              );
            const status = upstream.statusCode ?? 502;
            resolve(
              new Response(
                [204, 205, 304].includes(status) ? null : Buffer.concat(chunks),
                { status, headers }
              )
            );
          });
        }
      );
      request.on("error", reject);
      request.end(bytes);
    });
    captureNativeCookies(response.headers, session.cookies);
    return response;
  } catch {
    throw new NativeAdminError(502, "unavailable");
  }
}

export function readNativeIdentity(
  html: string
): { email: string; csrf: string } | null {
  const stack: DefaultTreeAdapterMap["node"][] = [parse(html)];
  let email = "";
  let csrf = "";
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if ("attrs" in node && node.tagName === "input") {
      const name = node.attrs.find(
        (attribute) => attribute.name === "name"
      )?.value;
      const value =
        node.attrs.find((attribute) => attribute.name === "value")?.value ?? "";
      if (name === "user.email") email = value;
      if (name === "csrf") csrf = value;
    }
    if ("childNodes" in node) stack.push(...node.childNodes);
  }
  return email && csrf ? { email, csrf } : null;
}

export async function verifyNativeIdentity(
  session: NativeSession,
  vhost?: string
): Promise<string> {
  const response = await nativeRequest("/user/pref", session, vhost);
  const html = await response.text();
  const identity = response.ok ? readNativeIdentity(html) : null;
  if (
    !identity ||
    identity.email.toLowerCase() !== session.email.toLowerCase() ||
    !session.cookies.key
  ) {
    if (response.status >= 500) throw new NativeAdminError(502, "unavailable");
    throw new NativeAdminError(401, "reauthenticate");
  }
  return html;
}

export async function logoutNativeSession(
  cookies: Cookies,
  email: string
): Promise<void> {
  try {
    const session = await getNativeSession(cookies, email);
    const html = await verifyNativeIdentity(session);
    const identity = readNativeIdentity(html);
    if (identity)
      await nativeRequest(
        "/user/logout",
        session,
        undefined,
        new URLSearchParams({ csrf: identity.csrf })
      );
  } catch {
    // Local logout must still work when the native session has expired or upstream is down.
  } finally {
    await forgetNativeSession(cookies);
  }
}
