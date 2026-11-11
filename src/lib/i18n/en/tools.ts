// English messages: quick tools (CSV download, command menu, campaign links).
// Keys are "tools.<name>"; {param} placeholders.
export default {
  "tools.csvChange": "Change (%)",
  "tools.csvDownload": "Download CSV",
  "tools.csvPath": "Path",
  "tools.csvShare": "Share (%)",
  "tools.csvTitle": "Title",
  "tools.paletteButton": "Search",
  "tools.paletteDescription":
    "Go to a report or page, switch site or pick a period.",
  "tools.paletteEmpty": "No matching report or action.",
  "tools.paletteLabel": "Search reports and actions",
  "tools.palettePeriod": "Period",
  "tools.palettePlaceholder": "Search reports and actions…",
  "tools.paletteSites": "Switch site",
  "tools.paletteTitle": "Command menu",
} as const satisfies Record<`tools.${string}`, string>;
