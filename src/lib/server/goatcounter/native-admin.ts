import { gunzipSync } from "node:zlib";
import { createHmac } from "node:crypto";
import { parse, type DefaultTreeAdapterMap } from "parse5";
import type { Cookies } from "@sveltejs/kit";
import type { NativePage, NativeSection } from "$lib/native-admin.js";
import { getBaseUrl } from "./client.js";
import { parseNativeAdmin } from "./native-admin-html.js";
import {
  getNativeSession,
  saveNativeSession,
  nativeRequest,
  verifyNativeIdentity,
  NativeAdminError,
  type NativeSession,
} from "./native-session.js";

const SECTION_PATHS = {
  users: "/settings/users",
  tokens: "/user/api",
  security: "/user/auth",
  imports: "/settings/export",
  pages: "/settings/purge",
  preferences: "/user/pref",
} as const;

export function isNativeSection(value: string): value is NativeSection {
  return Object.hasOwn(SECTION_PATHS, value);
}

export function nativePagePath(section: NativeSection, url: URL): string {
  if (section === "users") {
    const resource = url.searchParams.get("resource");
    if (resource && resource !== "add" && !/^[1-9]\d{0,12}$/.test(resource))
      throw new NativeAdminError(400, "invalid");
    return SECTION_PATHS.users + (resource ? `/${resource}` : "");
  }
  if (section !== "pages") return SECTION_PATHS[section];
  const query = new URLSearchParams();
  for (const key of ["path", "match-title", "match-case"]) {
    const value = url.searchParams.get(key);
    if (value && value.length <= 200) query.set(key, value);
  }
  return SECTION_PATHS.pages + (query.size ? `?${query}` : "");
}

function redirectPath(location: string, current: string): string {
  const base = new URL(getBaseUrl());
  const destination = new URL(location, `${getBaseUrl()}${current}`);
  const prefix = base.pathname.replace(/\/$/, "");
  if (
    destination.origin !== base.origin ||
    (prefix && !destination.pathname.startsWith(`${prefix}/`))
  )
    throw new NativeAdminError(502, "unavailable");
  const path = destination.pathname.slice(prefix.length);
  if (path === "/user/new") throw new NativeAdminError(401, "reauthenticate");
  if (
    !Object.values(SECTION_PATHS).some((allowed) => path === allowed) &&
    !/^\/settings\/users\/(?:add|[1-9]\d*)$/.test(path)
  )
    throw new NativeAdminError(502, "unavailable");
  return path + destination.search;
}

async function readPage(
  path: string,
  session: NativeSession,
  vhost?: string,
  initial?: Response
) {
  let response = initial ?? (await nativeRequest(path, session, vhost));
  for (let count = 0; count < 4; count++) {
    if (response.status >= 300 && response.status < 400) {
      path = redirectPath(response.headers.get("location") ?? "", path);
      response = await nativeRequest(path, session, vhost);
      continue;
    }
    if ([401, 403].includes(response.status))
      throw new NativeAdminError(403, "denied");
    if (!response.ok)
      throw new NativeAdminError(
        response.status === 429 ? 429 : 502,
        "unavailable"
      );
    const html = await response.text();
    const parsed = parseNativeAdmin(html, path, getBaseUrl());
    for (const form of parsed.page.forms) {
      for (const field of form.fields)
        if (field.name === "user.email") field.value = session.email;
      const submission = parsed.submissions.find(
        (entry) => entry.id === form.id && entry.method === form.method
      );
      if (submission)
        form.intent = createHmac("sha256", session.cookies.key)
          .update(
            JSON.stringify([
              vhost,
              path,
              form.id,
              submission.hidden.filter(([name]) => name !== "csrf"),
            ])
          )
          .digest("hex");
    }
    return { ...parsed, path, html };
  }
  throw new NativeAdminError(502, "unavailable");
}

export async function loadNativeAdmin(
  cookies: Cookies,
  email: string,
  section: NativeSection,
  url: URL,
  vhost?: string
): Promise<NativePage> {
  const session = await getNativeSession(cookies, email);
  try {
    await verifyNativeIdentity(session, vhost);
    return (await readPage(nativePagePath(section, url), session, vhost)).page;
  } finally {
    await saveNativeSession(cookies, session);
  }
}

export async function submitNativeAdmin(
  cookies: Cookies,
  email: string,
  section: NativeSection,
  url: URL,
  submitted: FormData,
  vhost?: string
): Promise<{ page: NativePage; path: string }> {
  const session = await getNativeSession(cookies, email);
  try {
    await verifyNativeIdentity(session, vhost);
    const current = await readPage(
      nativePagePath(section, url),
      session,
      vhost
    );
    const form = current.submissions.find(
      (candidate) =>
        candidate.method === "POST" &&
        candidate.id === submitted.get("__action")
    );
    if (!form || !form.hidden.some(([name, value]) => name === "csrf" && value))
      throw new NativeAdminError(400, "invalid");
    if (
      submitted.get("__intent") !==
      current.page.forms.find(
        (entry) => entry.id === form.id && entry.method === "POST"
      )?.intent
    )
      throw new NativeAdminError(400, "invalid");
    if (form.destructive && submitted.get("__confirm") !== "yes")
      throw new NativeAdminError(400, "invalid");
    const outgoing = new FormData();
    // Hidden state is read afresh. Browser-supplied paths, CSRF, fallback values,
    // roles and disabled controls can never replace the upstream form's values.
    const fieldNames = new Set(
      form.fields.filter((field) => !field.disabled).map((field) => field.name)
    );
    for (const name of submitted.keys())
      if (!name.startsWith("__") && !fieldNames.has(name))
        throw new NativeAdminError(400, "invalid");
    for (const [name, value] of form.hidden) {
      if (
        name === "csrf" ||
        form.fields.some((field) => field.name === name) ||
        (name === "paths" &&
          ["/settings/purge", "/settings/merge"].includes(form.action))
      )
        outgoing.append(name, value);
    }
    for (const name of fieldNames) {
      const controls = form.fields.filter(
        (field) => field.name === name && !field.disabled
      );
      const field = controls[0];
      const values = submitted.getAll(name);
      if (!["checkbox", "radio"].includes(field.type) && values.length > 1)
        throw new NativeAdminError(400, "invalid");
      if (field.type === "radio" && values.length > 1)
        throw new NativeAdminError(400, "invalid");
      if (field.required && values.length === 0)
        throw new NativeAdminError(400, "invalid");
      for (const value of values) {
        if (field.type === "file") {
          if (
            typeof value === "string" ||
            value.size === 0 ||
            value.size > 8 * 1024 * 1024 ||
            !/\.csv(?:\.gz)?$/i.test(value.name)
          )
            throw new NativeAdminError(413, "invalid");
          const buffer = Buffer.from(await value.arrayBuffer());
          if (/\.gz$/i.test(value.name)) {
            try {
              gunzipSync(buffer, { maxOutputLength: 32 * 1024 * 1024 });
            } catch {
              throw new NativeAdminError(400, "invalid");
            }
          }
          outgoing.append(name, value);
          continue;
        }
        if (
          typeof value !== "string" ||
          value.length > 4096 ||
          (field.required && !value.trim())
        )
          throw new NativeAdminError(400, "invalid");
        if (
          ["checkbox", "radio"].includes(field.type) &&
          !controls.some((control) => control.value === value)
        )
          throw new NativeAdminError(400, "invalid");
        if (
          field.type === "select" &&
          !field.options.some(
            (option) => !option.disabled && option.value === value
          )
        )
          throw new NativeAdminError(400, "invalid");
        if (name === "totp_token" && !/^\d{6}$/.test(value))
          throw new NativeAdminError(400, "invalid");
        if (
          field.type === "password" &&
          value &&
          name !== "c_password" &&
          (Buffer.byteLength(value) < 8 || Buffer.byteLength(value) > 50)
        )
          throw new NativeAdminError(400, "invalid");
        if (
          name === "user.email" &&
          value.toLowerCase() !== email.toLowerCase()
        )
          throw new NativeAdminError(400, "invalid");
        outgoing.append(name, value);
      }
    }
    const multipart = form.fields.some((field) => field.type === "file");
    const encoded = new URLSearchParams();
    if (!multipart)
      for (const [name, value] of outgoing)
        if (typeof value === "string") encoded.append(name, value);
    const response = await nativeRequest(
      form.action,
      session,
      vhost,
      multipart ? outgoing : encoded
    );
    const result = await readPage(current.path, session, vhost, response);
    return { page: result.page, path: result.path };
  } finally {
    await saveNativeSession(cookies, session);
  }
}

/** Explicit, uncached reveal; ordinary page loads never contain token values. */
export async function revealNativeToken(
  cookies: Cookies,
  email: string,
  id: string,
  vhost?: string
): Promise<string> {
  if (!/^[1-9]\d{0,12}$/.test(id)) throw new NativeAdminError(400, "invalid");
  const session = await getNativeSession(cookies, email);
  try {
    await verifyNativeIdentity(session, vhost);
    const { html } = await readPage("/user/api", session, vhost);
    const stack: DefaultTreeAdapterMap["node"][] = [parse(html)];
    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;
      if ("tagName" in node && node.tagName === "tr") {
        const children: DefaultTreeAdapterMap["node"][] = [node];
        let token = "";
        let matches = false;
        while (children.length) {
          const child = children.pop();
          if (!child) continue;
          if ("attrs" in child) {
            token ||=
              child.attrs.find((attribute) => attribute.name === "data-show")
                ?.value ?? "";
            matches ||= child.attrs.some(
              (attribute) =>
                attribute.name === "action" &&
                attribute.value.endsWith(`/user/api-token/remove/${id}`)
            );
          }
          if ("childNodes" in child) children.push(...child.childNodes);
        }
        if (matches && token && token.length < 4096) return token;
      }
      if ("childNodes" in node) stack.push(...node.childNodes);
    }
    throw new NativeAdminError(403, "denied");
  } finally {
    await saveNativeSession(cookies, session);
  }
}
