// Run: node --experimental-strip-types src/lib/server/goatcounter/totp-form.check.ts
import assert from "node:assert/strict";
import { parseTotpForm } from "./totp-form.ts";

// Shape of GoatCounter's tpl/totp.gohtml as rendered.
const form = `<h1>Multi-factor auth</h1>
<form method="post" action="/user/totplogin" class="vertical">
	<input type="hidden" name="loginmac" value="mac&#43;1=">
	<input type="hidden" name="user_logintoken" value="tok-123">
	<input type="text" name="totp_token" id="totp_token" required>
</form>`;

assert.deepEqual(parseTotpForm(form), {
  loginMac: "mac+1=",
  loginToken: "tok-123",
});
assert.equal(parseTotpForm("<form action='/user/new'></form>"), null);
assert.equal(
  parseTotpForm(form.replace('value="tok-123"', 'value=""')),
  null,
  "an empty token is not a challenge"
);

console.log("totp-form: ok");
