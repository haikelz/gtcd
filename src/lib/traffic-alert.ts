export const ALERT_DIRECTIONS = ["either", "increase", "decrease"] as const;

export type AlertDirection = (typeof ALERT_DIRECTIONS)[number];

export type TrafficAlertRule = {
  readonly direction: AlertDirection;
  readonly minimum: number;
  readonly threshold: number;
};

export function parseTrafficAlertRule(value: unknown): TrafficAlertRule | null {
  if (typeof value !== "object" || value === null) return null;

  const rule = value as Record<string, unknown>;
  if (
    !ALERT_DIRECTIONS.some((direction) => direction === rule.direction) ||
    typeof rule.threshold !== "number" ||
    !Number.isInteger(rule.threshold) ||
    rule.threshold < 1 ||
    rule.threshold > 10000 ||
    typeof rule.minimum !== "number" ||
    !Number.isSafeInteger(rule.minimum) ||
    rule.minimum < 1 ||
    rule.minimum > 1_000_000_000
  ) {
    return null;
  }

  return {
    direction: rule.direction as AlertDirection,
    minimum: rule.minimum,
    threshold: rule.threshold,
  };
}

/** Zero/low baselines and missing data never produce a misleading alert. */
export function evaluateTrafficAlert(
  rule: TrafficAlertRule,
  current: number,
  previous: number
): number | null {
  if (
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    current < 0 ||
    previous < rule.minimum
  ) {
    return null;
  }

  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < rule.threshold) return null;
  if (rule.direction === "increase" && change <= 0) return null;
  if (rule.direction === "decrease" && change >= 0) return null;

  return change;
}
