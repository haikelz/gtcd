export default {
  "diagnostics.title": "Diagnostics",
  "diagnostics.description":
    "Dependency observations and operational activity.",
  "diagnostics.refresh": "Refresh observations",
  "diagnostics.retry": "Retry",
  "diagnostics.refreshError": "Observations could not be refreshed. Try again.",
  "diagnostics.loading": "Loading observations…",
  "diagnostics.dependencies": "Dependencies",
  "diagnostics.observations":
    "GoatCounter observations expire after five minutes. Refresh schedules a background check at most once per minute.",
  "diagnostics.up": "Available",
  "diagnostics.down": "Unavailable",
  "diagnostics.unknown": "Unknown",
  "diagnostics.observedAt": "Last observation",
  "diagnostics.checkedAt": "Redis status checked",
  "diagnostics.lastSuccessAt": "Last success",
  "diagnostics.lastFailureAt": "Last failure",
  "diagnostics.counters": "Cache and upstream",
  "diagnostics.local":
    "Process-local counters since {startedAt}; not cluster totals. Refresh may reach a different replica. Cache misses exclude bypassed reads and deduplicated requests.",
  "diagnostics.sampledAt": "Sampled at",
  "diagnostics.memoryHits": "Memory cache hits",
  "diagnostics.sharedHits": "Shared cache hits",
  "diagnostics.misses": "Cache misses",
  "diagnostics.inflightDeduplications": "In-flight deduplications",
  "diagnostics.upstreamAttempts": "Upstream attempts",
  "diagnostics.rateLimited": "Rate-limited responses (429)",
  "diagnostics.backoffs": "Backoff waits",
  "diagnostics.retries": "Retry attempts",
  "diagnostics.scheduler": "Email scheduler",
  "diagnostics.schedulerDescription":
    "Shared delivery state. Counts cover retained delivery jobs, not recipients.",
  "diagnostics.lastRunAt": "Last scheduler run",
  "diagnostics.pending": "Pending jobs",
  "diagnostics.failed": "Failed jobs",
  "diagnostics.schedulerError":
    "Scheduler storage could not be read. Retry to check again.",
  "diagnostics.empty":
    "No scheduler activity has been recorded. Configure an email report to begin.",
  "diagnostics.configure": "Configure email reports",
};
