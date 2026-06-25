export type VelocityTier = "high" | "medium" | "low";
export type ReorderAlertLevel = "urgent" | "warning" | "none";

// "High" = used within 14 days, "Low" = no usage in over 90+ days (per the
// product brief). The 14-90 day gap isn't specified; days 15-90 are treated
// as "medium" so a shade isn't silently dropped into the slow-mover queue
// just because it hasn't been touched in the last fortnight.
const HIGH_VELOCITY_MAX_DAYS = 14;
const LOW_VELOCITY_MIN_DAYS = 90;

const VELOCITY_LOOKBACK_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ConsumptionRecord {
  quantityUsed: number;
  recordedAt: Date;
}

export function classifyVelocityTier(history: ConsumptionRecord[], now: Date = new Date()): VelocityTier {
  if (history.length === 0) return "low";

  const mostRecent = history.reduce((latest, row) => (row.recordedAt > latest ? row.recordedAt : latest), history[0].recordedAt);
  const daysSinceLastUse = (now.getTime() - mostRecent.getTime()) / MS_PER_DAY;

  if (daysSinceLastUse <= HIGH_VELOCITY_MAX_DAYS) return "high";
  if (daysSinceLastUse <= LOW_VELOCITY_MIN_DAYS) return "medium";
  return "low";
}

// Average units consumed per week over the lookback window. Returns 0 when
// there's no usage history to compute a velocity from.
export function computeVelocityPerWeek(history: ConsumptionRecord[], now: Date = new Date()): number {
  const cutoff = new Date(now.getTime() - VELOCITY_LOOKBACK_DAYS * MS_PER_DAY);
  const relevant = history.filter((row) => row.recordedAt >= cutoff);
  if (relevant.length === 0) return 0;

  const totalUsed = relevant.reduce((sum, row) => sum + row.quantityUsed, 0);
  const weeksInWindow = VELOCITY_LOOKBACK_DAYS / 7;
  return totalUsed / weeksInWindow;
}

// null when there's no usage history to predict from — callers should fall
// back to a flat par-level threshold in that case rather than claiming an
// (infinite) number of weeks of supply remaining.
export function computeWeeksOfSupplyRemaining(currentStock: number, velocityPerWeek: number): number | null {
  if (velocityPerWeek <= 0) return null;
  return currentStock / velocityPerWeek;
}

// Unbounded by the 90-day lookback window used for velocity — this needs the
// true last-used date (even if it was 6 months ago) to power the "Slow Mover
// (Used once in X months)" label, which the lookback-filtered history can't
// answer once a product falls outside that window.
export function computeDaysSinceLastUse(lastUsedAt: Date | null, now: Date = new Date()): number | null {
  if (!lastUsedAt) return null;
  return (now.getTime() - lastUsedAt.getTime()) / MS_PER_DAY;
}

// "Highly active shade" / "moderate shade" from the brief map onto the
// high/medium velocity tiers — a slow mover never triggers a predictive
// alert since a low velocity item already gets held in the budget review
// queue (see reorderBudget.ts) rather than treated as urgent.
export function classifyAlertLevel(weeksOfSupplyRemaining: number | null, velocityTier: VelocityTier): ReorderAlertLevel {
  if (weeksOfSupplyRemaining === null) return "none";
  if (velocityTier === "high" && weeksOfSupplyRemaining < 1.5) return "urgent";
  if (velocityTier === "medium" && weeksOfSupplyRemaining < 3) return "warning";
  return "none";
}
