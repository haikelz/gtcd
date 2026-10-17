// English messages: settings. Keys are "settings.<name>"; {param} placeholders.
export default {
  "settings.accessToken": "Access token",
  "settings.addSite": "Add a site",
  "settings.addSiteDescription":
    "Create a child site for another analytics hostname. Configure its host in your GoatCounter reverse proxy before it can receive data.",
  "settings.allowEmbed": "Allowed embed origins",
  "settings.allowEmbedHelp": "Allow one trusted origin per line.",
  "settings.analyticsHostname": "Analytics hostname",
  "settings.availableSites": "Available sites",
  "settings.awaitingData": "Awaiting data",
  "settings.bosmangDescription": "Allow GoatCounter's Bosmang interface.",
  "settings.collectHelp":
    "Changes apply to future visits. Existing analytics data is not removed.",
  "settings.collectHitsDescription": "Store pageviews for CSV exports.",
  "settings.collectHitsLabel": "Individual pageviews",
  "settings.collectLanguageDescription": "Record supported browser languages.",
  "settings.collectLanguageLabel": "Language",
  "settings.collectLegend": "Data to collect",
  "settings.collectLocationDescription": "Record visitor country.",
  "settings.collectLocationLabel": "Country",
  "settings.collectReferrerDescription":
    "Record referrer headers and campaign parameters.",
  "settings.collectReferrerLabel": "Referrers and campaigns",
  "settings.collectRegionDescription":
    "Record regional detail for selected countries.",
  "settings.collectRegionLabel": "Region",
  "settings.collectRegions": "Countries with regional reporting",
  "settings.collectRegionsHelp":
    "Comma-separated country codes, only where regional detail is needed.",
  "settings.collectScreenSizeDescription": "Record viewport dimensions.",
  "settings.collectScreenSizeLabel": "Screen size",
  "settings.collectSessionsDescription":
    "Estimate unique visitors for up to eight hours.",
  "settings.collectSessionsLabel": "Sessions",
  "settings.collectUserAgentDescription":
    "Derive names from the User-Agent without storing the header.",
  "settings.collectUserAgentLabel": "Browser and system",
  "settings.counterImageAlt": "Visitor count",
  "settings.counterPath": "Counter path",
  "settings.counterPathHelp":
    "A page path such as {path}, or {total} for the whole site.",
  "settings.counterUrl": "{format} URL",
  "settings.counterUrlLabel": "{format} counter URL",
  "settings.createPublicLink": "Create public link",
  "settings.createSite": "Create site",
  "settings.createSiteFailed": "GoatCounter could not create this site.",
  "settings.dataControls": "Data controls",
  "settings.dataControlsDescription":
    "Choose how long analytics data is kept and which traffic to ignore.",
  "settings.dataRetention": "Data retention",
  "settings.dataRetentionHelp": "Use 0 to retain data indefinitely.",
  "settings.days": "days",
  "settings.description":
    "Control the data GoatCounter keeps and where your analytics can appear.",
  "settings.embedSnippet": "Embed snippet",
  "settings.generate": "Generate",
  "settings.hostname": "Hostname",
  "settings.identityDescription":
    "Connect this analytics site to the website people visit.",
  "settings.ignoreIps": "Ignored IP addresses",
  "settings.ignoreIpsHelp":
    "Exclude internal traffic using one IP address or CIDR range per line.",
  "settings.ignoreIpsPlaceholder": "One IP or CIDR per line",
  "settings.invalidHostname": "Provide a valid analytics hostname.",
  "settings.invalidSecret": "Access token: use 8 to 40 letters and digits.",
  "settings.invalidSettings": "Please provide valid site settings.",
  "settings.invalidVisibility": "Choose private, secret link or public.",
  "settings.linkDomainHelp":
    "Use the canonical URL for the website this site measures.",
  "settings.linkedWebsiteUrl": "Linked website URL",
  "settings.nativeAdmin": "Administration",
  "settings.nativeAdminDescription":
    "Manage users, API tokens, security, imports and page data without leaving GTCD.",
  "settings.newLink": "New link",
  "settings.notSaved": "Settings not saved",
  "settings.optional": "(optional)",
  "settings.publicDashboard": "Public dashboard",
  "settings.publicDashboardDescription":
    "A read-only gtcd overview anyone with the link can open. No login, no settings, no exports.",
  "settings.publicDashboardLink": "Public dashboard link",
  "settings.publicLinkHelp":
    "A new link or revoking stops the current link from working.",
  "settings.publicSetting": "Public setting",
  "settings.receivingData": "Receiving data",
  "settings.retention": "Retention",
  "settings.retentionDays": "{count} days",
  "settings.reviewField":
    "GoatCounter could not save your settings. Review the highlighted field.",
  "settings.revoke": "Revoke",
  "settings.saveChanges": "Save changes",
  "settings.saveFailed": "GoatCounter could not save these settings.",
  "settings.saveForShareLink": "Save to get the share link for this token.",
  "settings.saveToEnableCounter": "Save to turn the counter on.",
  "settings.saved": "Site settings saved.",
  "settings.secretHelp":
    "8 to 40 letters and digits. A new token stops old share links from working.",
  "settings.secretPlaceholder": "Generated on save",
  "settings.sendTestVisit": "Send test visit",
  "settings.seoDescription": "Manage GoatCounter site settings.",
  "settings.seoTitle": "Site settings — gtcd",
  "settings.shareLink": "Share link",
  "settings.shareLinkNeedsAdminUrl":
    "Set {envVar} to get a ready-made share link.",
  "settings.sharing": "Sharing and counters",
  "settings.sharingDescription":
    "Set where analytics can be embedded and which public counters are available.",
  "settings.siteCreateFailed": "Site not created",
  "settings.siteCreatePermission":
    "Creating a site needs the GoatCounter API token to have site-create permission. Grant site-create to the configured GOATCOUNTER_API_KEY, then reload.",
  "settings.siteCreated": "Site created.",
  "settings.siteNotManageable": "This site cannot be managed here.",
  "settings.siteReadPermission":
    "Settings needs the GoatCounter API token to have site-read permission. Grant site-read and site-update to the configured GOATCOUNTER_API_KEY, then reload.",
  "settings.siteUpdatePermission":
    "Saving settings needs the GoatCounter API token to have site-update permission. Grant it to the configured GOATCOUNTER_API_KEY, then reload.",
  "settings.testVisitFailed": "Test visit failed.",
  "settings.testVisitHelp":
    "Records one labelled event to confirm gtcd can write to GoatCounter.",
  "settings.testVisitNeedsCount":
    "The GoatCounter API token needs the count permission to send a test visit.",
  "settings.testVisitNotRecorded":
    "GoatCounter could not record the test visit.",
  "settings.testVisitRejected":
    "GoatCounter rejected the test visit ({status}).",
  "settings.testVisitSent":
    "Test visit sent. It shows up as the event gtcd-connection-test within a minute.",
  "settings.title": "Site settings",
  "settings.unlimited": "Unlimited",
  "settings.visibility": "Dashboard visibility",
  "settings.visibilityPrivate": "Private",
  "settings.visibilityPrivateDescription":
    "Only signed-in GoatCounter users can see the dashboard.",
  "settings.visibilityPublic": "Public",
  "settings.visibilityPublicDescription":
    "Anyone can view the GoatCounter dashboard.",
  "settings.visibilitySecret": "Secret link",
  "settings.visibilitySecretDescription":
    "Anyone with the share link can view the dashboard.",
  "settings.visitorCounter": "Visitor counter",
  "settings.visitorCounterDescription": "Allow the public visitor counter.",
} as const satisfies Record<`settings.${string}`, string>;
