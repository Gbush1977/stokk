import type { InventoryItem, ReorderEntry, StockStatus } from "./types";

const CRITICAL_THRESHOLD = 0.3;

export function getStatus(item: InventoryItem): StockStatus {
  return item.quantity >= item.parLevel ? "full" : "partial";
}

export function isCritical(item: InventoryItem): boolean {
  return item.quantity <= item.parLevel * CRITICAL_THRESHOLD;
}

export function getReorderQty(item: InventoryItem): number {
  return Math.max(item.parLevel - item.quantity, 0);
}

export function getStockHealthPercent(items: InventoryItem[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + Math.min(item.quantity / item.parLevel, 1), 0);
  return Math.round((total / items.length) * 100);
}

export function getCriticalCount(items: InventoryItem[]): number {
  return items.filter(isCritical).length;
}

export function getReorderList(items: InventoryItem[]): ReorderEntry[] {
  return items
    .filter((item) => getStatus(item) === "partial")
    .map((item) => ({ item, reorderQty: getReorderQty(item), critical: isCritical(item) }))
    .sort((a, b) => b.reorderQty - a.reorderQty);
}
