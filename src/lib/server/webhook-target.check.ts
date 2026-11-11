// Run: node --experimental-strip-types src/lib/server/webhook-target.check.ts
import assert from "node:assert/strict";
import {
  channelRequest,
  checkWebhookUrl,
  isBlockedAddress,
  isTelegramTarget,
  maskSecret,
  parseAllowedHosts,
} from "./webhook-target.ts";

// Loopback, private, link-local, metadata, CGNAT, multicast and reserved.
for (const address of [
  "0.0.0.0",
  "10.1.2.3",
  "100.64.0.1",
  "100.100.100.200",
  "127.0.0.1",
  "127.255.255.254",
  "168.63.129.16",
  "169.254.169.254",
  "172.16.0.1",
  "172.31.255.255",
  "192.0.0.170",
  "192.168.1.1",
  "198.18.0.1",
  "224.0.0.1",
  "239.255.255.250",
  "255.255.255.255",
  "::",
  "::1",
  "[::1]",
  "::127.0.0.1",
  "::ffff:127.0.0.1",
  "::ffff:7f00:1",
  "[::ffff:a9fe:a9fe]",
  "::ffff:10.0.0.1",
  "::ffff:0:192.168.0.1",
  "64:ff9b::a9fe:a9fe",
  "64:ff9b:1::1",
  "2002:7f00:1::",
  "2001::1",
  "2001:db8::1",
  "100::1",
  "fc00::1",
  "fd00:ec2::254",
  "fe80::1",
  "fe80::1%en0",
  "fec0::1",
  "ff02::1",
]) {
  assert.equal(isBlockedAddress(address), true, address);
}

// Ordinary public addresses, including the ones next to blocked ranges.
for (const address of [
  "1.1.1.1",
  "8.8.8.8",
  "100.63.255.255",
  "100.128.0.0",
  "172.15.255.255",
  "172.32.0.0",
  "168.63.129.17",
  "2606:4700:4700::1111",
  "2001:4860:4860::8888",
  "::ffff:8.8.8.8",
  "64:ff9b::808:808",
  "2002:808:808::",
]) {
  assert.equal(isBlockedAddress(address), false, address);
}

// Malformed or non-canonical input fails closed.
for (const value of [
  "",
  "localhost",
  "example.com",
  "010.0.0.1",
  "1.2.3",
  "1.2.3.4.5",
  "256.1.1.1",
  "1::2::3",
  "12345::1",
  "1:2:3:4:5:6:7:8:9",
]) {
  assert.equal(isBlockedAddress(value), true, value);
}

const none = parseAllowedHosts(undefined);
const allowed = parseAllowedHosts(" Hooks.Internal. , localhost ::1");
assert.deepEqual(
  [...allowed].sort(),
  ["[::1]", "hooks.internal", "localhost"].sort()
);

function problem(value: string, hosts = none): string | undefined {
  const result = checkWebhookUrl(value, hosts);
  return "problem" in result ? result.problem : undefined;
}

assert.equal(problem("https://hooks.slack.com/services/T0/B0/X"), undefined);
assert.equal(problem("not a url"), "invalid");
assert.equal(problem(`https://example.com/${"a".repeat(2048)}`), "invalid");
assert.equal(problem("http://example.com/hook"), "protocol");
assert.equal(problem("ftp://example.com/hook"), "protocol");
assert.equal(problem("https://user:pass@example.com/hook"), "credentials");
assert.equal(problem("https://token@example.com/hook"), "credentials");
// WHATWG URL parsing canonicalizes numeric hosts before the check.
assert.equal(problem("https://127.0.0.1/hook"), "private");
assert.equal(problem("https://0x7f.1/hook"), "private");
assert.equal(problem("https://2130706433/hook"), "private");
assert.equal(problem("https://[::ffff:127.0.0.1]/hook"), "private");
assert.equal(problem("https://169.254.169.254/latest/meta-data"), "private");
assert.equal(problem("https://10.0.0.1:8443/hook"), "private");
// Host names pass here; their resolved addresses are checked at connect time.
assert.equal(problem("https://localhost/hook"), undefined);

// The allowlist trusts exact hosts, over http too, but never credentials.
const trusted = checkWebhookUrl("http://localhost:4000/hook", allowed);
assert.ok("trusted" in trusted && trusted.trusted);
assert.equal(problem("http://[::1]:4000/hook", allowed), undefined);
assert.equal(problem("https://hooks.internal./hook", allowed), undefined);
assert.equal(problem("http://127.0.0.1:4000/hook", allowed), "protocol");
assert.equal(problem("https://127.0.0.1:4000/hook", allowed), "private");
assert.equal(problem("http://user:pw@localhost/hook", allowed), "credentials");
const untrusted = checkWebhookUrl("https://example.com/hook", allowed);
assert.ok("trusted" in untrusted && !untrusted.trusted);

assert.equal(
  isTelegramTarget("123456789:not-a-real-token-for-tests-abcd", "-1001234"),
  true
);
assert.equal(
  isTelegramTarget("123456789:not-a-real-token-for-tests-abcd", "@gtcd_ops"),
  true
);
assert.equal(isTelegramTarget("123:short", "-1001234"), false);
assert.equal(
  isTelegramTarget("123456789:not-a-real-token-for-tests-abcd/../x", "1"),
  false
);
assert.equal(
  isTelegramTarget("123456789:not-a-real-token-for-tests-abcd", "chat"),
  false
);

const message = {
  event: "alert",
  site: "demo.example",
  text: "Traffic alert: demo.example",
} as const;

assert.deepEqual(
  channelRequest(
    { chatId: null, secret: "https://hooks.slack.com/x", type: "slack" },
    message
  ),
  {
    body: '{"text":"Traffic alert: demo.example"}',
    url: "https://hooks.slack.com/x",
  }
);
const discord = channelRequest(
  {
    chatId: null,
    secret: "https://discord.com/api/webhooks/1/x",
    type: "discord",
  },
  { ...message, text: "x".repeat(2500) }
);
assert.equal(JSON.parse(discord.body).content.length, 2000);
assert.deepEqual(JSON.parse(discord.body).allowed_mentions, { parse: [] });
const telegram = channelRequest(
  { chatId: "-1001234", secret: "123:abc", type: "telegram" },
  message
);
assert.equal(telegram.url, "https://api.telegram.org/bot123:abc/sendMessage");
assert.deepEqual(JSON.parse(telegram.body), {
  chat_id: "-1001234",
  disable_web_page_preview: true,
  text: "Traffic alert: demo.example",
});
assert.deepEqual(
  JSON.parse(
    channelRequest(
      { chatId: null, secret: "https://example.com/hook", type: "webhook" },
      message
    ).body
  ),
  message
);

// Masks keep the origin and four characters, never the secret path or token.
const slackUrl = "https://hooks.slack.com/services/T000/B000/XXXXXXXXsecret";
assert.equal(maskSecret("slack", slackUrl), "https://hooks.slack.com/••••cret");
assert.equal(
  maskSecret("telegram", "123456789:not-a-real-token-for-tests-abcd"),
  "••••abcd"
);
assert.equal(
  maskSecret("webhook", "https://a.example/x"),
  "https://a.example/••••"
);
assert.ok(!maskSecret("slack", slackUrl).includes("services"));

console.log("webhook-target: all checks passed");
