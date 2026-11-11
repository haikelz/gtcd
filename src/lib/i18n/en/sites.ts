// English messages: sites. Keys are "sites.<name>"; {param} placeholders.
export default {
  "sites.columnSite": "Site",
  "sites.columnVisits": "Visits",
  "sites.count": "{count} sites",
  "sites.day": "Day",
  "sites.description":
    "Visits for every site the API token can read. Open a site to see its overview.",
  "sites.list": "Sites",
  "sites.loadFailed": "Visits could not load. Retry in a moment.",
  "sites.loading": "Loading visits for {site}",
  "sites.nav": "All sites",
  "sites.seoDescription": "Visits for every GoatCounter site.",
  "sites.seoTitle": "All sites",
  "sites.tableCaption": "Daily visits for {site}",
  "sites.title": "All sites",
  "sites.trendDescription": "Daily visits from {start} to {end}.",
  "sites.trendLabel": "Visit trend for {site}",
} as const satisfies Record<`sites.${string}`, string>;
