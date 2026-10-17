export type NativeSection =
  "users" | "tokens" | "security" | "imports" | "pages" | "preferences";

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
