// English messages: admin. Keys are "admin.<name>"; {param} placeholders.
export default {
  "admin.access": "Access",
  "admin.allUsers": "All users",
  "admin.confirm":
    "I confirm: {title}. This changes stored data or account access and may not be reversible.",
  "admin.emailReadOnly":
    "Your sign-in address is read-only here. An administrator can change it in Users.",
  "admin.hideToken": "Hide token",
  "admin.importDescription":
    "Use GoatCounter CSV or CSV.gz files, up to 8 MB (32 MB uncompressed). Google Analytics imports add totals, not full visitor history. Accepted uploads are processed in the background; acceptance does not mean the import has finished. Replacing data deletes existing pageviews.",
  "admin.importTitle": "Before you import",
  "admin.messageError": "Review your request",
  "admin.messageInfo": "GoatCounter response",
  "admin.noControlsDescription":
    "Your account may not have access, or this GoatCounter version uses different forms. API tokens also require a verified email address. No changes have been sent.",
  "admin.noControlsTitle": "No administration controls available",
  "admin.notFound": "Administration page not found.",
  "admin.open": "Open administration",
  "admin.problemDenied":
    "Your GoatCounter account does not have permission to make this change.",
  "admin.problemInvalid":
    "The form is no longer valid. Reload this page, check your entries and confirm the action again. Import files must be CSV or CSV.gz, up to 8 MB.",
  "admin.problemReauthenticate":
    "Your GoatCounter session has expired. Sign out and sign in again to continue.",
  "admin.problemUnavailable":
    "GoatCounter could not complete the request. Check the current state before trying again.",
  "admin.reconnect": "Sign out and reconnect",
  "admin.required": "Administrator access is required.",
  "admin.revealToken": "Reveal token: {name}",
  "admin.revealedTokenDescription":
    "Keep this credential private. It is only shown after an explicit request.",
  "admin.revealedTokenTitle": "Revealed API token",
  "admin.sectionImports": "Import data",
  "admin.sectionImportsDescription":
    "Upload historical pageviews to the selected GoatCounter site.",
  "admin.sectionPages": "Page data",
  "admin.sectionPagesDescription":
    "Find recorded paths, then delete or merge their pageviews. This does not change your website.",
  "admin.sectionPreferences": "GoatCounter preferences",
  "admin.sectionPreferencesDescription":
    "Update your native account display settings and GoatCounter email reports. GTCD display preferences and scheduled reports are separate.",
  "admin.sectionSecurity": "Account security",
  "admin.sectionSecurityDescription":
    "Change your password and manage two-factor authentication.",
  "admin.sectionTokens": "API tokens",
  "admin.sectionTokensDescription":
    "Create credentials for integrations and revoke tokens you no longer use.",
  "admin.sectionUsers": "Users",
  "admin.sectionUsersDescription": "Manage access to this GoatCounter site.",
  "admin.seoTitle": "{section} — Administration",
  "admin.submitting": "Submitting…",
  "admin.tableCaption": "{section} in GoatCounter",
  "admin.title": "Administration",
  "admin.tokenLabel": "API token",
  "admin.totpSetupHelp":
    "Add this setup key to your authenticator, then enter its six-digit code. Store the key privately; GoatCounter does not issue recovery codes.",
  "admin.totpSetupKey": "Authenticator setup key",
  "admin.unavailableTitle": "Administration unavailable",
} as const satisfies Record<`admin.${string}`, string>;
