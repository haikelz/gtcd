// English messages: quick tools (CSV download, command menu, campaign links).
// Keys are "tools.<name>"; {param} placeholders.
export default {
  "tools.csvChange": "Change (%)",
  "tools.csvDownload": "Download CSV",
  "tools.csvPath": "Path",
  "tools.csvShare": "Share (%)",
  "tools.csvTitle": "Title",
  "tools.linkCampaign": "Campaign",
  "tools.linkContent": "Content",
  "tools.linkHelp":
    "GoatCounter's Campaigns report reads utm_campaign (or campaign), and utm_source becomes the referrer. GoatCounter 2.7 ignores utm_medium, utm_term and utm_content.",
  "tools.linkIncomplete":
    "Enter the page URL, source and campaign to get the link.",
  "tools.linkMedium": "Medium",
  "tools.linkOpen": "Build a campaign link",
  "tools.linkReady": "Link ready.",
  "tools.linkResult": "Tagged link",
  "tools.linkSource": "Source",
  "tools.linkTerm": "Term",
  "tools.linkTitle": "Campaign link",
  "tools.linkUrl": "Page URL",
  "tools.linkUrlInvalid":
    "Enter a full address that starts with http:// or https://.",
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
