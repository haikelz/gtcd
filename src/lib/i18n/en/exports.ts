// English messages: exports. Keys are "exports.<name>"; {param} placeholders.
export default {
  "exports.createDescription":
    "GoatCounter prepares a compressed archive in the background.",
  "exports.createExport": "Create export",
  "exports.csvCursorHelp":
    "Paste the last hit ID from an earlier CSV export to download only newer pageviews.",
  "exports.csvDescription":
    "Individual pageviews for spreadsheets and data tools.",
  "exports.description":
    "Package your GoatCounter analytics for your own reporting workflow.",
  "exports.download": "Download {format}",
  "exports.fileSize": "File size",
  "exports.format": "Format",
  "exports.goatCounterError": "GoatCounter reported an error",
  "exports.invalidCursor": "CSV cursor must be a positive whole number.",
  "exports.invalidFormat": "Choose an export format.",
  "exports.invalidStartDate": "Choose a valid JSON export start date.",
  "exports.jobSummary": "Export #{id}, {format} file.",
  "exports.jsonDateHelp":
    "Leave blank to include all aggregate data, or choose a day to export newer data only.",
  "exports.jsonDescription": "Aggregate data for a portable analytics backup.",
  "exports.jsonUnsupported":
    "This GoatCounter release does not support JSON exports. Use CSV, or upgrade GoatCounter to a build with JSON export support.",
  "exports.requestFailed":
    "GoatCounter could not create the export. Check export permissions and the hourly export limit, then try again.",
  "exports.limitsHelp":
    "One export request per hour. Completed files stay available for 24 hours.",
  "exports.notFound": "Export not found.",
  "exports.notRequested": "Export not requested",
  "exports.optional": "(optional)",
  "exports.permission":
    "Exports need the GoatCounter API token to have export permission.",
  "exports.permissionReload":
    "Exports need the GoatCounter API token to have export permission. Grant export permission to GOATCOUNTER_API_KEY, then reload.",
  "exports.preparingDescription":
    "Refresh the status when the file is ready to download.",
  "exports.preparingTitle": "GoatCounter is preparing this export",
  "exports.refreshStatus": "Refresh status",
  "exports.rowsIncluded": "Rows included",
  "exports.seoDescription": "Export GoatCounter analytics data.",
  "exports.seoTitle": "Exports — gtcd",
  "exports.startAfterHitId": "Start after hit ID",
  "exports.startDate": "Start date",
  "exports.stateFailed": "Export failed",
  "exports.statePreparing": "Preparing export",
  "exports.stateReady": "Ready to download",
  "exports.statusDescription":
    "Requested exports show their progress and download here.",
  "exports.statusTitle": "Export status",
  "exports.stepCreateDescription":
    "Choose CSV for individual pageviews or JSON for aggregate data.",
  "exports.stepCreateCsvDescription":
    "Export retained individual pageviews as CSV.",
  "exports.stepCreateTitle": "Create an export",
  "exports.stepDownloadDescription":
    "The completed file is available through this protected dashboard.",
  "exports.stepDownloadTitle": "Download securely",
  "exports.stepWaitDescription":
    "The request runs in GoatCounter, so it does not interrupt dashboard use.",
  "exports.stepWaitTitle": "Wait for preparation",
  "exports.title": "Data exports",
} as const satisfies Record<`exports.${string}`, string>;
