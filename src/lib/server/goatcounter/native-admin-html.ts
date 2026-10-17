import { parse, type DefaultTreeAdapterMap } from "parse5";
import type { NativeField, NativePage } from "../../native-admin.ts";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
type Submission = {
  id: string;
  action: string;
  method: "GET" | "POST";
  hidden: [string, string][];
  fields: NativeField[];
  destructive: boolean;
};
type Rule = { type: NativeField["type"]; values?: readonly string[] };
const POSITIVE_ID = /^[1-9]\d*$/;
const SKIP = new Set([
  "script",
  "style",
  "svg",
  "template",
  "noscript",
  "nav",
  "header",
  "footer",
]);
const LANGUAGES =
  "id-ID cs-CZ de-DE en-GB es-CL fr-FR it-IT nl-NL no-NO pl-PL pt-BR ro-RO sk-SK tr-TR ru-RU uk-UA hi th-TH zh-TW ja-JP zh-CN ko-KR".split(
    " "
  );

function attr(node: Node, name: string): string {
  return "attrs" in node
    ? (node.attrs.find((a) => a.name === name)?.value ?? "")
    : "";
}

function has(node: Node, name: string): boolean {
  return "attrs" in node && node.attrs.some((a) => a.name === name);
}

function elements(root: Node): Element[] {
  const found: Element[] = [];
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if ("tagName" in node) {
      if (SKIP.has(node.tagName) || has(node, "data-show")) continue;
      found.push(node);
    }
    if ("childNodes" in node) stack.push(...[...node.childNodes].reverse());
  }
  return found;
}

function text(root: Node, excludeForms = false): string {
  const parts: string[] = [];
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (
      "tagName" in node &&
      (SKIP.has(node.tagName) ||
        has(node, "data-show") ||
        (excludeForms && node.tagName === "form"))
    )
      continue;
    if (node.nodeName === "#text" && "value" in node) parts.push(node.value);
    if ("childNodes" in node) stack.push(...[...node.childNodes].reverse());
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function ancestor(node: Node, tag: string): Element | undefined {
  let parent = "parentNode" in node ? node.parentNode : null;
  while (parent) {
    if ("tagName" in parent && parent.tagName === tag) return parent;
    parent = "parentNode" in parent ? parent.parentNode : null;
  }
  return undefined;
}

function allowedGet(path: string): boolean {
  return /^\/(?:user\/(?:pref|auth|api)|settings\/(?:users(?:\/(?:add|[1-9]\d*))?|export|purge))$/.test(
    path
  );
}

function allowedPost(path: string): boolean {
  return /^\/(?:user\/(?:pref|change-password|enable-totp|disable-totp|api-token(?:\/remove\/[1-9]\d*)?)|settings\/(?:users\/(?:add|[1-9]\d*|remove\/[1-9]\d*)|export\/import(?:-ga)?|purge|merge))$/.test(
    path
  );
}

function fieldRule(
  path: string,
  method: string,
  name: string
): Rule | undefined {
  const plain = (type: NativeField["type"]): Rule => ({ type });
  const choice = (
    type: NativeField["type"],
    values: readonly string[]
  ): Rule => ({ type, values });
  if (method === "GET") {
    if (path !== "/settings/purge") return undefined;
    if (name === "path") return plain("text");
    if (["match-title", "match-case"].includes(name)) return plain("checkbox");
    return undefined;
  }
  if (/^\/settings\/users\/(add|[1-9]\d*)$/.test(path)) {
    if (name === "email") return plain("email");
    if (name === "password") return plain("password");
    if (name === "access[all]") return choice("radio", ["r", "s", "a", "*"]);
  }
  if (
    path === "/user/change-password" &&
    ["c_password", "password", "password2"].includes(name)
  )
    return plain("password");
  if (path === "/user/enable-totp" && name === "totp_token")
    return plain("text");
  if (path === "/user/api-token") {
    if (name === "name") return plain("text");
    if (name === "permissions[]")
      return choice("checkbox", ["2", "4", "8", "16", "32", "64"]);
    if (name === "sites[]") return plain("checkbox");
  }
  if (path.startsWith("/settings/export/import")) {
    if (name === "csv") return plain("file");
    if (name === "replace" && path === "/settings/export/import")
      return plain("checkbox");
  }
  if (path === "/settings/merge" && name === "merge_with")
    return plain("select");
  if (path !== "/user/pref") return undefined;
  if (name === "user.email") return plain("email");
  if (
    [
      "set_site",
      "user.settings.twenty_four_hours",
      "user.settings.sunday_starts_week",
      "user.settings.fewer_numbers",
      "user.settings.datepicker",
    ].includes(name)
  )
    return plain("checkbox");
  switch (name) {
    case "user.settings.language":
      return choice("select", LANGUAGES);
    case "user.settings.date_format":
      return choice("select", [
        "2006-01-02",
        "02-01-2006",
        "01/02/06",
        "2 Jan ’06",
        "Mon Jan 2 2006",
      ]);
    case "user.settings.number_format":
      return choice("select", ["8239", "160", "44", "46", "39", "1"]);
    case "user.settings.timezone":
      return plain("select");
    case "user.settings.email_reports":
      return choice("select", ["0", "1", "2", "3", "4"]);
    case "fewer_numbers_lock":
      return choice("select", ["", "week", "month"]);
    case "theme":
      return choice("select", ["", "light", "dark"]);
    default:
      return undefined;
  }
}

/** Bounded extraction, not an HTML proxy. Only `page` may cross the browser boundary. */
export function parseNativeAdmin(
  html: string,
  pagePath: string,
  baseUrl: string
): { page: NativePage; submissions: Submission[] } {
  if (html.length > 2_000_000)
    throw new Error("Native administration page exceeds parsing limit");
  const base = new URL(baseUrl);
  const prefix = base.pathname.replace(/\/$/, "");

  function canonical(raw: string, relativeTo: URL): string | undefined {
    // URL normalisation erases traversal, so inspect before resolving.
    const rawPath = raw.split(/[?#]/)[0];
    if (
      raw.includes("\\") ||
      [...raw].some((character) => character.charCodeAt(0) <= 32) ||
      /%(?:2e|2f|5c)/i.test(rawPath) ||
      rawPath.split("/").includes("..")
    )
      return undefined;
    let url: URL;
    try {
      url = new URL(raw, relativeTo);
    } catch {
      return undefined;
    }
    if (url.origin !== base.origin || url.username || url.password || url.hash)
      return undefined;
    let path = url.pathname;
    if (prefix && path.startsWith(`${prefix}/`))
      path = path.slice(prefix.length);
    else if (prefix) return undefined;
    const query = new URLSearchParams();
    if (path === "/settings/purge") {
      for (const key of ["path", "match-title", "match-case"]) {
        for (const value of url.searchParams.getAll(key))
          query.append(key, value);
      }
    }
    return path + (query.size ? `?${query}` : "");
  }

  // Callers use canonical page paths; upstream-prefixed paths are also accepted.
  const pageUrl = new URL(
    pagePath.startsWith(`${prefix}/`) && prefix
      ? pagePath
      : `${prefix}${pagePath}`,
    base
  );
  const current = canonical(pageUrl.href, base)?.split("?")[0];
  const page: NativePage = {
    forms: [],
    tables: [],
    links: [],
    messages: [],
    setupSecret: null,
  };
  const submissions: Submission[] = [];
  if (!current || !allowedGet(current)) return { page, submissions };

  const document = parse(html);
  const all = elements(document);
  if (all.length > 30_000)
    throw new Error("Native administration page exceeds element limit");
  const root =
    all.find((el) => el.tagName === "main") ??
    all.find((el) => attr(el, "class").split(/\s+/).includes("page")) ??
    all.find((el) => el.tagName === "body") ??
    document;
  const content = elements(root);
  const seen = new Set<string>();

  for (const form of content.filter((el) => el.tagName === "form")) {
    const action = canonical(attr(form, "action") || pageUrl.href, pageUrl);
    const method = (attr(form, "method") || "GET").toUpperCase();
    if (!action || (method !== "GET" && method !== "POST")) continue;
    const path = action.split("?")[0];
    if (
      !(method === "GET" ? allowedGet(path) : allowedPost(path)) ||
      seen.has(`${method} ${action}`)
    )
      continue;
    seen.add(`${method} ${action}`);
    const controls = elements(form);
    const hidden: [string, string][] = [];
    const fields: NativeField[] = [];

    for (const control of controls) {
      if (!["input", "select", "textarea"].includes(control.tagName)) continue;
      const name = attr(control, "name");
      const rule = fieldRule(path, method, name);
      const inputType = attr(control, "type").toLowerCase();
      if (!name) continue;
      if (has(control, "form")) continue;
      if (inputType === "hidden") {
        // Hidden state is retained only on the server, including checkbox fallbacks.
        hidden.push([name, attr(control, "value")]);
        continue;
      }
      if (!rule) continue;
      if (["submit", "button", "reset", "image"].includes(inputType)) continue;
      if ((rule.type === "select") !== (control.tagName === "select")) continue;
      if (control.tagName === "textarea") continue;
      if (
        ["checkbox", "radio", "file", "password"].includes(rule.type) &&
        inputType !== rule.type
      )
        continue;
      if (
        ["text", "email"].includes(rule.type) &&
        !["", "text", "email"].includes(inputType)
      )
        continue;
      let value =
        attr(control, "value") ||
        (["checkbox", "radio"].includes(rule.type) ? "on" : "");
      if (
        rule.type === "password" ||
        rule.type === "file" ||
        name === "user.email"
      )
        value = "";
      if (name === "sites[]" && value !== "-1" && !POSITIVE_ID.test(value))
        continue;
      if (rule.values && rule.type !== "select" && !rule.values.includes(value))
        continue;
      const options =
        rule.type === "select"
          ? elements(control)
              .filter((el) => el.tagName === "option")
              .flatMap((option) => {
                const optionValue = has(option, "value")
                  ? attr(option, "value")
                  : text(option);
                if (rule.values && !rule.values.includes(optionValue))
                  return [];
                if (name === "merge_with" && !POSITIVE_ID.test(optionValue))
                  return [];
                if (
                  name === "user.settings.timezone" &&
                  !/^(?:\.UTC|(?:[A-Z]{2}\.)?[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)+)$/.test(
                    optionValue
                  )
                )
                  return [];
                const group = ancestor(option, "optgroup");
                return [
                  {
                    value: optionValue,
                    label: text(option),
                    disabled:
                      has(option, "disabled") ||
                      (!!group && has(group, "disabled")),
                  },
                ];
              })
          : [];
      if (rule.type === "select") {
        const selected = elements(control).find(
          (el) => el.tagName === "option" && has(el, "selected")
        );
        const selectedValue = selected
          ? has(selected, "value")
            ? attr(selected, "value")
            : text(selected)
          : options[0]?.value;
        value =
          options.find((option) => option.value === selectedValue)?.value ??
          options[0]?.value ??
          "";
      }
      const label =
        controls.find(
          (el) =>
            el.tagName === "label" &&
            attr(control, "id") &&
            attr(el, "for") === attr(control, "id")
        ) ?? ancestor(control, "label");
      const fieldset = ancestor(control, "fieldset");
      const legend = fieldset
        ? elements(fieldset).find((el) => el.tagName === "legend")
        : undefined;
      const siblings =
        "parentNode" in control &&
        control.parentNode &&
        "childNodes" in control.parentNode
          ? control.parentNode.childNodes
          : [];
      const next = siblings
        .slice(siblings.indexOf(control) + 1)
        .find((node) => "tagName" in node && !["br"].includes(node.tagName));
      const help =
        attr(label ?? control, "title") ||
        (next && "tagName" in next && next.tagName === "span"
          ? text(next)
          : "");
      fields.push({
        name,
        label: (label ? text(label) : legend ? text(legend) : "") || name,
        type: rule.type,
        value,
        checked: has(control, "checked"),
        disabled:
          has(control, "disabled") || (!!fieldset && has(fieldset, "disabled")),
        required: has(control, "required"),
        options,
        help,
      });
    }

    const submit = controls.find(
      (el) =>
        (el.tagName === "button" &&
          !["button", "reset"].includes(attr(el, "type"))) ||
        (el.tagName === "input" && attr(el, "type") === "submit")
    );
    const submitLabel = submit
      ? text(submit) || attr(submit, "value")
      : "Submit";
    const legend = controls.find((el) => el.tagName === "legend");
    const row = ancestor(form, "tr");
    const identity = row
      ? text(elements(row).find((el) => el.tagName === "td") ?? row, true)
      : "";
    const title = identity
      ? `${submitLabel}: ${identity}`
      : (legend ? text(legend) : "") || submitLabel;
    const destructive =
      method === "POST" &&
      (/\/remove\//.test(path) ||
        [
          "/user/disable-totp",
          "/settings/purge",
          "/settings/merge",
          "/settings/export/import",
          "/settings/export/import-ga",
        ].includes(path));
    submissions.push({
      id: action,
      action,
      method,
      hidden,
      fields,
      destructive,
    });
    page.forms.push({
      id: action,
      title,
      method,
      fields,
      submitLabel,
      destructive,
    });
    if (path === "/user/enable-totp") {
      const code = controls.find(
        (el) =>
          el.tagName === "code" && /^[A-Z2-7]{16,128}={0,6}$/.test(text(el))
      );
      if (code) page.setupSecret = text(code);
    }
  }

  for (const table of content.filter(
    (el) =>
      current !== "/settings/export" &&
      el.tagName === "table" &&
      !ancestor(el, "form")
  )) {
    const rows = elements(table).filter(
      (el) => el.tagName === "tr" && ancestor(el, "table") === table
    );
    page.tables.push({
      headers: rows.flatMap((row) =>
        elements(row)
          .filter((el) => el.tagName === "th")
          .map((el) => text(el, true))
      ),
      rows: rows
        .map((row) =>
          elements(row)
            .filter((el) => el.tagName === "td")
            .map((el) => text(el, true))
        )
        .filter((cells) => cells.length > 0),
    });
  }
  for (const el of content) {
    if (el.tagName === "a") {
      const path = canonical(attr(el, "href"), pageUrl);
      if (
        path &&
        /^\/settings\/users\/(?:add|[1-9]\d*)$/.test(path) &&
        !page.links.some((link) => link.path === path)
      )
        page.links.push({
          label: /^\/settings\/users\/[1-9]\d*$/.test(path)
            ? `${text(el)}: ${text(elements(ancestor(el, "tr") ?? el).find((cell) => cell.tagName === "td") ?? el, true)}`
            : text(el),
          path,
        });
    }
    const classes = attr(el, "class").split(/\s+/);
    if (
      classes.some((name) =>
        [
          "flash",
          "error",
          "field-error",
          "validate",
          "validation-error",
        ].includes(name)
      )
    ) {
      const message = text(el);
      const error = classes.some(
        (name) =>
          name === "flash-e" ||
          name.includes("error") ||
          name.startsWith("validat")
      );
      if (
        message &&
        !page.messages.some(
          (entry) => entry.text === message || entry.text.includes(message)
        )
      )
        page.messages.push({ text: message, error });
    }
  }
  return { page, submissions };
}
