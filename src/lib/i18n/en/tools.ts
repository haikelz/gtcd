// English messages: quick tools (CSV download, command menu, campaign links).
// Keys are "tools.<name>"; {param} placeholders.
export default {
  "tools.csvChange": "Change (%)",
  "tools.csvDownload": "Download CSV",
  "tools.csvPath": "Path",
  "tools.csvShare": "Share (%)",
  "tools.csvTitle": "Title",
} as const satisfies Record<`tools.${string}`, string>;
