import type { ReorderDeficit } from "../../lib/types";

export type StockStatus = "full" | "partial";

export interface InventoryItem {
  sku: string;
  brand: string;
  line: string;
  shade: string;
  // The "half-tube" split: a sealed, full box is tracked distinctly from a
  // partially-used backbar tube (e.g. 0.5 of a tube remaining).
  fullUnits: number;
  partialFraction: number;
  parLevel: number;
}

export interface DashboardReport {
  items: InventoryItem[];
  totalActiveItems: number;
  stockroomFullnessPercent: number;
  criticalCount: number;
  // Prioritized for this week's wholesale order, high velocity first.
  activeOrderSheet: ReorderDeficit[];
  // Slow-moving deficits held back from the active order to preserve budget.
  pendingBudgetReview: ReorderDeficit[];
}

export type { ReorderDeficit };
