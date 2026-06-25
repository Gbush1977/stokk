import type { ReorderDeficit } from "../../api/_lib/types.ts";

const VELOCITY_PRIORITY: Record<ReorderDeficit["velocityTier"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

// High velocity items consume the weekly budget pool first; within a tier,
// the biggest deficits go first.
function budgetPrioritySort(a: ReorderDeficit, b: ReorderDeficit): number {
  const tierDiff = VELOCITY_PRIORITY[a.velocityTier] - VELOCITY_PRIORITY[b.velocityTier];
  if (tierDiff !== 0) return tierDiff;
  return b.reorderQuantity - a.reorderQuantity;
}

export interface BudgetAllocation {
  activeOrderSheet: ReorderDeficit[];
  pendingBudgetReview: ReorderDeficit[];
}

// Low-velocity ("slow mover") shades are intercepted before they land on the
// active weekly order — they're held in a Pending Budget Review queue
// instead, unless a manager has manually force-approved them via
// budgetOverride, so the weekly color budget isn't spent on dead stock.
export function allocateOrderBudget(deficits: ReorderDeficit[]): BudgetAllocation {
  const activeOrderSheet: ReorderDeficit[] = [];
  const pendingBudgetReview: ReorderDeficit[] = [];

  for (const deficit of deficits) {
    if (deficit.velocityTier === "low" && !deficit.budgetOverride) {
      pendingBudgetReview.push(deficit);
    } else {
      activeOrderSheet.push(deficit);
    }
  }

  activeOrderSheet.sort(budgetPrioritySort);
  pendingBudgetReview.sort((a, b) => b.reorderQuantity - a.reorderQuantity);

  return { activeOrderSheet, pendingBudgetReview };
}
