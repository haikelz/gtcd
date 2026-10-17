// Run: node --experimental-strip-types src/lib/server/goatcounter/native-admin-html.check.ts
import assert from "node:assert/strict";
import { parseNativeAdmin } from "./native-admin-html.ts";

const base = "https://counter.example/admin";
const tokens = parseNativeAdmin(
  `
<nav><form method="post" action="/admin/user/logout"><button>Logout</button></form></nav>
<div class="page"><h2>API</h2>
<table><thead><tr><th>Name</th><th>Token</th><th>Actions</th></tr></thead><tbody>
<tr><td>Deployment token<script>script-private</script><style>style-private</style><svg><text>svg-private</text></svg></td>
<td><a href="#" data-show="fake-token-secret">show</a></td>
<td><form method="post" action="/admin/user/api-token/remove/12"><input type="hidden" name="csrf" value="fake-csrf"><button class="link">Delete</button></form></td></tr>
</tbody></table>
<form method="post" action="api-token"><fieldset><legend>Add token</legend>
<input type="hidden" name="csrf" value="fake-csrf">
<input type="hidden" name="permissions[]" value="1">
<label for="name">Name</label><input id="name" name="name" value="Automation"><span>Choose a name.</span>
<label title="Record pageviews"><input type="checkbox" name="permissions[]" value="2" checked>Count</label>
<label><input type="checkbox" name="permissions[]" value="64" disabled>Stats</label>
<input type="checkbox" name="permissions[]" value="999">
<label><input type="checkbox" name="sites[]" value="-1" checked>All sites</label>
<label><input type="checkbox" name="sites[]" value="7">Other site</label>
<input name="user.access" value="superuser"><button type="submit">Add new</button>
</fieldset></form>
<form method="post" action="https://evil.example/admin/user/api-token"><input name="name" value="external"></form>
<form method="post" action="/admin/../admin/user/api-token"></form>
<form method="post" action="/admin/%2e%2e/admin/user/api-token"></form>
<form method="post" action="/admin/settings/export"></form>
<a href="/admin/settings/users/add">Add user</a><a href="/admin/settings/users/9">Edit user</a>
<a href="https://evil.example/settings/users/9">External</a><a href="/admin/settings/users/remove/9">Delete user</a>
<div class="flash flash-e">Invalid <b>name</b><script>never-message</script></div>
<span class="error">Invalid name</span>
</div>`,
  "/user/api",
  base
);

assert.equal(tokens.page.forms.length, 2);
const token = tokens.page.forms.find((form) => form.id === "/user/api-token");
assert.ok(token);
assert.equal(token.title, "Add token");
assert.equal(token.submitLabel, "Add new");
assert.deepEqual(
  token.fields.map((field) => [field.name, field.value]),
  [
    ["name", "Automation"],
    ["permissions[]", "2"],
    ["permissions[]", "64"],
    ["sites[]", "-1"],
    ["sites[]", "7"],
  ]
);
assert.equal(token.fields[0].label, "Name");
assert.equal(token.fields[0].help, "Choose a name.");
assert.equal(token.fields[1].checked, true);
assert.equal(token.fields[1].help, "Record pageviews");
assert.equal(token.fields[2].disabled, true);
assert.deepEqual(
  tokens.submissions.find((form) => form.id === token.id)?.hidden,
  [
    ["csrf", "fake-csrf"],
    ["permissions[]", "1"],
  ]
);
assert.equal(tokens.page.forms[0].title, "Delete: Deployment token");
assert.equal(tokens.page.forms[0].destructive, true);
assert.deepEqual(tokens.page.tables[0].rows, [["Deployment token", "", ""]]);
assert.deepEqual(tokens.page.messages, [{ text: "Invalid name", error: true }]);
assert.deepEqual(
  tokens.page.links.map((link) => link.path),
  ["/settings/users/add", "/settings/users/9"]
);
assert.doesNotMatch(
  JSON.stringify(tokens.page),
  /fake-csrf|fake-token-secret|private|never-message|superuser|data-show|<script/
);

const pref = parseNativeAdmin(
  `<main><form method="post" action="/admin/user/pref">
<input name="user.email" value="change-email-private">
<label><input type="checkbox" name="user.settings.fewer_numbers" checked disabled>
<input type="hidden" name="user.settings.fewer_numbers" value="on">Fewer numbers</label>
<input type="hidden" name="opaque_state" value="server-only">
<label for="theme">Theme</label><select id="theme" name="theme">
<option value="">System</option><optgroup disabled label="Appearance"><option value="dark" selected>Dark</option></optgroup>
<option value="superuser">Injected</option></select>
<select name="user.settings.language"><option value="en-GB">English</option><option value="superuser">Injected</option></select>
<input name="user.settings.admin" value="true"><input type="submit" value="Save">
</form></main>`,
  "/admin/user/pref",
  base
);
assert.equal(pref.page.forms[0].submitLabel, "Save");
assert.equal(pref.page.forms[0].fields[0].value, "");
assert.equal(pref.page.forms[0].fields[1].label, "Fewer numbers");
assert.equal(pref.page.forms[0].fields[1].disabled, true);
assert.deepEqual(pref.page.forms[0].fields[2].options, [
  { value: "", label: "System", disabled: false },
  { value: "dark", label: "Dark", disabled: true },
]);
assert.equal(pref.page.forms[0].fields[2].value, "dark");
assert.doesNotMatch(
  JSON.stringify(pref.page),
  /superuser|server-only|opaque_state|change-email-private|user.settings.admin/
);
assert.deepEqual(pref.submissions[0].hidden, [
  ["user.settings.fewer_numbers", "on"],
  ["opaque_state", "server-only"],
]);
const timezones = parseNativeAdmin(
  `<form method="post" action="/admin/user/pref"><select name="user.settings.timezone">
  <option value=".UTC">UTC</option><option value="ID.Asia/Jakarta" selected>Jakarta</option>
  <option value="US.America/New_York">New York</option><option value="invalid">Invalid</option>
  </select></form>`,
  "/user/pref",
  base
).page.forms[0].fields[0];
assert.deepEqual(
  timezones.options.map((option) => option.value),
  [".UTC", "ID.Asia/Jakarta", "US.America/New_York"]
);
assert.equal(timezones.value, "ID.Asia/Jakarta");

const security = parseNativeAdmin(
  `<main><code>OUTSIDESETUPCODE</code>
<form method="post" action="/user/change-password"><fieldset><legend>Password</legend>
<input type="password" name="c_password" value="password-private" required>
<input type="password" name="password" value="password-private"><input type="password" name="password2" value="password-private"><button>Change</button></fieldset></form>
<form method="post" action="/user/enable-totp"><code>JBSWY3DPEHPK3PXP</code><input name="totp_token" required><button>Enable</button></form>
</main>`,
  "/user/auth",
  "https://counter.example"
);
assert.equal(security.page.setupSecret, "JBSWY3DPEHPK3PXP");
assert.ok(security.page.forms[0].fields.every((field) => field.value === ""));
assert.equal(security.page.forms[0].fields[0].label, "Password");
assert.equal(security.page.forms[0].fields[0].required, true);
assert.doesNotMatch(
  JSON.stringify(security.page),
  /password-private|OUTSIDESETUPCODE/
);
assert.equal(
  parseNativeAdmin("<code>JBSWY3DPEHPK3PXP</code>", "/user/auth", base).page
    .setupSecret,
  null
);

const purge = parseNativeAdmin(
  `<div class="page">
<form method="get" action="purge?match-case=on&path=%2Fdocs&ignored=secret"><input name="path" value="/docs" required>
<label><input type="checkbox" name="match-title" checked><input type="hidden" name="match-title" value="off">Title</label>
<label><input type="checkbox" name="match-case">Case</label><button>Search</button></form>
<form method="post" action="/admin/settings/purge"><input type="hidden" name="paths" value="1,2,"><button>Delete</button></form>
<form method="post" action="/admin/settings/merge"><input type="hidden" name="paths" value="1,2,"><select name="merge_with"><option value="4">/destination</option><option value="superuser">bad</option></select><button>Merge</button></form>
</div>`,
  "/settings/purge",
  base
);
assert.equal(
  purge.page.forms[0].id,
  "/settings/purge?path=%2Fdocs&match-case=on"
);
assert.deepEqual(
  purge.page.forms[0].fields.map((field) => field.name),
  ["path", "match-title", "match-case"]
);
assert.deepEqual(
  purge.page.forms.map((form) => form.destructive),
  [false, true, true]
);
assert.equal(purge.submissions[1].hidden[0][1], "1,2,");
const sameAction = parseNativeAdmin(
  '<form method="get" action="/settings/purge"></form><form method="post" action="/settings/purge"></form>',
  "/settings/purge",
  "https://counter.example"
);
assert.deepEqual(
  sameAction.page.forms.map((form) => form.method),
  ["GET", "POST"]
);

const imports = parseNativeAdmin(
  `<main><form method="post" action="/admin/settings/export"><button>Export</button></form>
<form method="post" action="/admin/settings/export/import"><input type="file" name="csv" required><label><input type="checkbox" name="replace">Replace</label><button>Import</button></form>
<form method="post" action="/admin/settings/export/import-ga"><input type="file" name="csv"><button>Upload</button></form></main>`,
  "/settings/export",
  base
);
assert.equal(imports.page.forms.length, 2);
assert.ok(imports.page.forms.every((form) => form.destructive));
assert.equal(imports.page.forms[0].fields[0].type, "file");
assert.equal(imports.page.forms[0].fields[0].required, true);

const users = parseNativeAdmin(
  `<main><table><tr><td>person@example.test</td><td><form method="post" action="/admin/settings/users/remove/3"><button>Delete</button></form></td></tr></table>
<form method="post" action="/admin/settings/users/3"><input name="email" value="person@example.test"><input type="password" name="password" value="password-private">
<fieldset><legend>Access</legend><label><input type="radio" name="access[all]" value="r" checked>Read only</label><label><input type="radio" name="access[all]" value="*">Superuser</label></fieldset>
<select name="access[all]"><option value="superuser">Injected</option></select><input name="user.arbitrary" value="bad"><button>Edit</button></form></main>`,
  "/settings/users/3",
  base
);
assert.equal(users.page.forms[0].title, "Delete: person@example.test");
assert.deepEqual(
  users.page.forms[1].fields.map((field) => field.value),
  ["person@example.test", "", "r", "*"]
);
assert.doesNotMatch(
  JSON.stringify(users.page),
  /Injected|user.arbitrary|password-private/
);
assert.equal(
  parseNativeAdmin(
    '<form method="post" action="/user/api-token"></form>',
    "/user/logout",
    base
  ).page.forms.length,
  0
);
assert.throws(
  () => parseNativeAdmin("x".repeat(2_000_001), "/user/api", base),
  /limit/
);

for (const action of [
  "https://evil.example/admin/user/api-token",
  "//evil.example/admin/user/api-token",
  "/admin/../admin/user/api-token",
  "/admin/%2e%2e/admin/user/api-token",
  "/admin/user/logout",
  "/admin/settings/export",
  "/admin/settings/users/remove/0",
]) {
  assert.equal(
    parseNativeAdmin(
      `<form method="post" action="${action}"><button>Send</button></form>`,
      "/user/api",
      base
    ).submissions.length,
    0,
    `reject ${action}`
  );
}

console.log("native-admin-html: ok");
