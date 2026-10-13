// No imports: src/lib/server/goatcounter/totp-form.check.ts runs this file
// directly with node --experimental-strip-types.

export type TotpChallenge = {
  readonly loginMac: string;
  readonly loginToken: string;
};

function hiddenValue(html: string, name: string): string | null {
  // GoatCounter's totp.gohtml renders <input type="hidden" name="…" value="…">.
  for (const tag of html.match(/<input\b[^>]*>/gi) ?? []) {
    if (!new RegExp(`\\bname=["']${name}["']`, "i").test(tag)) continue;
    const value = /\bvalue=["']([^"']*)["']/i.exec(tag)?.[1];
    return value
      ? value.replaceAll("&#43;", "+").replaceAll("&amp;", "&")
      : null;
  }
  return null;
}

/**
 * Read the challenge from GoatCounter's TOTP form, or null when the page is
 * not that form. loginToken is the user's GoatCounter session token, so it
 * must stay on the server.
 */
export function parseTotpForm(html: string): TotpChallenge | null {
  if (!/action=["'][^"']*\/user\/totplogin["']/i.test(html)) return null;

  const loginMac = hiddenValue(html, "loginmac");
  const loginToken = hiddenValue(html, "user_logintoken");
  return loginMac && loginToken ? { loginMac, loginToken } : null;
}
