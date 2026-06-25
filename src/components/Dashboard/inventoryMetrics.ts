import type { InventoryItem, ReorderDeficit, StockStatus } from "./types";

const CRITICAL_THRESHOLD = 0.3;

export function getCurrentStock(item: InventoryItem): number {
  return item.fullUnits + item.partialFraction;
}

export function getStatus(item: InventoryItem): StockStatus {
  return getCurrentStock(item) >= item.parLevel ? "full" : "partial";
}

export function isCritical(item: InventoryItem): boolean {
  return getCurrentStock(item) <= item.parLevel * CRITICAL_THRESHOLD;
}

export function getReorderQty(item: InventoryItem): number {
  return Math.max(item.parLevel - getCurrentStock(item), 0);
}

export function getStockHealthPercent(items: InventoryItem[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + Math.min(getCurrentStock(item) / item.parLevel, 1), 0);
  return Math.round((total / items.length) * 100);
}

export function getCriticalCount(items: InventoryItem[]): number {
  return items.filter(isCritical).length;
}

// Fallback deficit list for the offline/no-DB mock dataset only — the live
// dashboard gets fully predictive ReorderDeficits straight from
// /api/inventory/report instead of computing them client-side, since real
// velocity tiers require ConsumptionHistory this mock data doesn't have.
export function buildMockReorderDeficits(items: InventoryItem[]): ReorderDeficit[] {
  return items
    .filter((item) => getStatus(item) === "partial")
    .map(
      (item): ReorderDeficit => ({
        sku: item.sku,
        brand: item.brand,
        line: item.line,
        shadeCode: item.shade,
        currentStock: getCurrentStock(item),
        idealStockLevel: item.parLevel,
        reorderQuantity: getReorderQty(item),
        critical: isCritical(item),
        weeksOfSupplyRemaining: null,
        velocityTier: "medium",
        alertLevel: "none",
        aiPredicted: false,
        budgetOverride: false,
        daysSinceLastUse: null,
      }),
    )
    .sort((a, b) => b.reorderQuantity - a.reorderQuantity);
}
