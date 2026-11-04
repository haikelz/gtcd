# Administration and reports

How to manage sites, accounts, sharing and report delivery in gtcd. The policy
behind these features lives in [PRODUCT.md](../PRODUCT.md).

## Who can do what

- Every signed-in user can read reports, save views, change their own
  preferences and manage their own account security.
- Emails listed in `GTCD_ADMIN_EMAILS` can also change site settings, run
  exports, manage share links and users, tokens, imports and page data, and open
  **Diagnostics**.
- GoatCounter still enforces each user's own permissions on administration
  screens, so the allowlist never grants more than GoatCounter allows.

## Site settings

**Settings** changes the site selected in the dashboard:

- the linked website URL and data retention;
- ignored IP addresses or CIDR ranges, one per line;
- country codes for regional reporting, comma-separated;
- trusted embed origins, one per line;
- dashboard visibility, the public visitor counter and Bosmang options.

**Send test visit** records a labelled pageview through the API to confirm gtcd
can write to GoatCounter. The visitor counter is served by GoatCounter at
`/counter/<path>.svg|png|html|json`.

## Administration screens

**Administration** holds gtcd's screens for users and roles, API tokens,
passwords and TOTP, CSV and Google Analytics imports, deleting or merging
pageviews, and GoatCounter's own preferences and email reports. GoatCounter runs
unchanged; these screens use the signed-in user's GoatCounter session, never the
shared API token.

- After upgrading gtcd, sign out and back in once to create that session.
  Native cookies and CSRF values stay server-side in Redis, so protect Redis and
  its backups like credentials.
- Signing out also signs out of GoatCounter, which can end other GoatCounter
  sessions of the same user.
- Token secrets appear only after **Reveal token**. gtcd refuses to reveal the
  token it uses itself.
- Imports accept up to 8 MiB uploaded and 32 MiB decompressed; see
  [request size](DEPLOYMENT.md#proxies-hosts-and-request-size).
- Imports, merges and purges run as GoatCounter background jobs. Accepting the
  job is not completion; check GoatCounter's logs for failures.
- The screens are verified against stock GoatCounter 2.7. Unknown forms fail
  closed, so recheck them after a GoatCounter upgrade.

gtcd's own display settings and email reports are separate from GoatCounter's
preferences and native email reports, which need GoatCounter's own SMTP setup.

## Views, sharing and delivery

- **Saved views:** **Views → Save current view** keeps the site, period,
  filters, grouping and scale. Manage views and the default view in
  **Customize**.
- **Period comparison:** the overview compares pageviews and events with the
  previous period of the same length. Missing baselines show as unavailable.
- **Share links:** administrators create named, read-only links in **Settings**
  that expire after 1, 7 (default) or 30 days, or never. Each link can limit the
  date range and metric categories, and can be replaced or revoked on its own.
  Anyone holding an active link can read the report.
- **Email summaries and traffic alerts:** configure SMTP, then opt in from
  **Customize**. Summaries go out daily, weekly, every two weeks or monthly
  after 07:00 in your GoatCounter timezone. Alerts compare the last completed
  day's pageviews with the day before, using your direction, threshold and
  minimum baseline; checks start the day after you save a rule, and a zero or
  too-small baseline never alerts. Both go only to the signed-in account's
  email.

The server checks schedules every 15 minutes while it runs. Failed sends retry
with backoff up to five times. A crash after the SMTP server accepts a message
but before gtcd records it can send that email twice. Reports pause for anyone
who hasn't signed in to gtcd for 90 days and resume at their next sign-in. See
[scheduled delivery](REDIS_STATE.md#scheduled-delivery-semantics).

## Sessions

gtcd checks each signed-in user against GoatCounter at most every 5 minutes and
ends the session once GoatCounter rejects it, so removing or signing out a user
in GoatCounter reaches gtcd within that window. A GoatCounter outage keeps
sessions alive. Failed logins lock an email for 15 minutes after 5 attempts, and
an IP after 20 when `ADDRESS_HEADER` is set.

## Diagnostics and search indexing

**Diagnostics** shows dependency status with timestamps, this process's request
and cache counters, and scheduled delivery state.

gtcd is a private application: every response carries
`X-Robots-Tag: noindex, nofollow`, and shared reports use generic preview
metadata without the site name or access token. Noindex is not access control;
previously indexed URLs can take time to disappear.
