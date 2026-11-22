// English messages: common. Keys are "common.<name>"; {param} placeholders.
export default {
  "common.bodyTooLarge": "This request is too large. Send at most 512 KiB.",
  "common.copy": "Copy",
  "common.filterLimit":
    "This site has more than {limit} paths, the limit for path filtering. Remove the filter to view this report.",
  "common.rateLimited":
    "GoatCounter is limiting requests right now. Wait a few seconds, then retry.",
  "common.reportLoadFailed": "This report could not load",
  "common.retry": "Retry",
  "common.tokenSiteAccess":
    "gtcd's API token can't read this site. An admin can fix this from the API token warning in Settings.",
  "common.upstreamError":
    "GoatCounter answered with an error. Retry, and if it keeps failing, check GoatCounter's log.",
  "common.upstreamUnavailable":
    "GoatCounter is not responding. Retry in a moment.",
} as const satisfies Record<`common.${string}`, string>;
