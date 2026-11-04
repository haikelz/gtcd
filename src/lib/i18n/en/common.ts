// English messages: common. Keys are "common.<name>"; {param} placeholders.
export default {
  "common.copy": "Copy",
  "common.filterLimit":
    "This site has more than {limit} paths, the limit for path filtering. Remove the filter to view this report.",
  "common.rateLimited":
    "GoatCounter is limiting requests right now. Wait a few seconds, then retry.",
  "common.reportLoadFailed": "This report could not load",
  "common.retry": "Retry",
  "common.upstreamUnavailable":
    "GoatCounter is not responding. Retry in a moment.",
} as const satisfies Record<`common.${string}`, string>;
