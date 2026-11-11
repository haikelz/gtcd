import type { MessageKey } from "$lib/i18n";

export type NativeSection =
  "users" | "tokens" | "security" | "imports" | "pages" | "preferences";

/**
 * Native-administration sections in menu order, shared by the section menu
 * and the command menu. `admin` sections need a dashboard admin.
 */
export const NATIVE_SECTIONS = [
  {
    admin: true,
    description: "admin.sectionUsersDescription",
    id: "users",
    title: "admin.sectionUsers",
  },
  {
    admin: true,
    description: "admin.sectionTokensDescription",
    id: "tokens",
    title: "admin.sectionTokens",
  },
  {
    admin: false,
    description: "admin.sectionSecurityDescription",
    id: "security",
    title: "admin.sectionSecurity",
  },
  {
    admin: true,
    description: "admin.sectionImportsDescription",
    id: "imports",
    title: "admin.sectionImports",
  },
  {
    admin: true,
    description: "admin.sectionPagesDescription",
    id: "pages",
    title: "admin.sectionPages",
  },
  {
    admin: false,
    description: "admin.sectionPreferencesDescription",
    id: "preferences",
    title: "admin.sectionPreferences",
  },
] as const satisfies readonly {
  admin: boolean;
  description: MessageKey;
  id: NativeSection;
  title: MessageKey;
}[];

export type NativeField = {
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "date"
    | "checkbox"
    | "radio"
    | "select"
    | "textarea"
    | "file";
  value: string;
  checked: boolean;
  disabled: boolean;
  required: boolean;
  options: { value: string; label: string; disabled: boolean }[];
  help: string;
};

export type NativeForm = {
  id: string;
  intent?: string;
  title: string;
  method: "GET" | "POST";
  fields: NativeField[];
  submitLabel: string;
  destructive: boolean;
};

export type NativePage = {
  forms: NativeForm[];
  tables: { headers: string[]; rows: string[][] }[];
  links: { label: string; path: string }[];
  messages: { text: string; error: boolean }[];
  setupSecret: string | null;
};
