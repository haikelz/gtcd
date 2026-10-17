// English messages: email. Keys are "email.<name>"; {param} placeholders.
export default {
  "email.trafficSubject": "Traffic alert: {site}",
  "email.trafficHeadline":
    "Pageviews changed {change} on {date} compared with the previous day.",
  "email.trafficCounts": "{current} pageviews, previously {previous}.",
  "email.trafficFailed":
    "Could not check or deliver the traffic alert. The next scheduled check will retry. Check GoatCounter access and SMTP settings.",
  "email.headlineChange": "Visits {change} vs. the previous period",
  "email.headlineCount": "{count} visits",
  "email.headlineCountChange": "{count} visits ({change})",
  "email.headlineSummary": "Your visits summary",
  "email.manage": "Change or stop these emails",
  "email.manageFallback":
    "Change or stop these emails on the gtcd Customize page.",
  "email.manageUrl": "Change or stop these emails: {url}",
  "email.noData": "No data",
  "email.noTotals": "GoatCounter did not return totals for the report.",
  "email.openDashboard": "Open the dashboard",
  "email.openDashboardUrl": "Open the dashboard: {url}",
  "email.reportBiweekly": "Two-weekly report",
  "email.reportDaily": "Daily report",
  "email.reportFor": "{report} for {site}",
  "email.reportMonthly": "Monthly report",
  "email.reportWeekly": "Weekly report",
  "email.sendFailed": "Sending failed.",
  "email.siteUnavailable": "The report's GoatCounter site is not accessible.",
  "email.subject": "{title}: {headline}",
  "email.topCountries": "Top countries",
  "email.topPages": "Top pages",
  "email.topReferrers": "Top referrers",
  "email.unknown": "Unknown",
} as const satisfies Record<`email.${string}`, string>;
