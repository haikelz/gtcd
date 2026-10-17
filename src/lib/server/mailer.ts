import { env } from "$env/dynamic/private";
import nodemailer, { type Transporter } from "nodemailer";

type SmtpConfig = {
  readonly from: string;
  readonly host: string;
  readonly password?: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user?: string;
};

let transporter: Transporter | null = null;
let transporterKey = "";

function read(name: string): string | undefined {
  const value = env[name] ?? process.env[name];
  return value?.trim() || undefined;
}

/** SMTP settings from the environment, or null when email is not set up. */
export function getSmtpConfig(): SmtpConfig | null {
  const host = read("SMTP_HOST");
  const from = read("SMTP_FROM");
  if (!host || !from) return null;

  const secure = read("SMTP_SECURE") === "true";
  const port = Number(read("SMTP_PORT") ?? (secure ? 465 : 587));

  return {
    from,
    host,
    password: read("SMTP_PASSWORD"),
    port: Number.isInteger(port) && port > 0 ? port : 587,
    secure,
    user: read("SMTP_USER"),
  };
}

export function isMailConfigured(): boolean {
  return getSmtpConfig() !== null;
}

/** Public dashboard origin for links in emails, e.g. https://analytics.example.com. */
export function getPublicUrl(): string | null {
  const value = read("GTCD_PUBLIC_URL");
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.hostname === "localhost"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function getTransporter(config: SmtpConfig): Transporter {
  const key = JSON.stringify(config);
  if (transporter && key === transporterKey) return transporter;

  transporter = nodemailer.createTransport({
    auth: config.user
      ? { pass: config.password ?? "", user: config.user }
      : undefined,
    host: config.host,
    port: config.port,
    secure: config.secure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
  transporterKey = key;
  return transporter;
}

export async function sendMail(message: {
  readonly html: string;
  readonly subject: string;
  readonly text: string;
  readonly to: string;
}): Promise<void> {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error("Email is not configured. Set SMTP_HOST and SMTP_FROM.");
  }

  await getTransporter(config).sendMail({ ...message, from: config.from });
}
