// English messages: common. Keys are "common.<name>"; {param} placeholders.
export default {
  "common.cancel": "Cancel",
  "common.copy": "Copy",
  "common.loading": "Loading",
  "common.reportLoadFailed": "This report could not load",
  "common.retry": "Retry",
  "common.save": "Save",
  "common.unknown": "Unknown",
} as const satisfies Record<`common.${string}`, string>;
