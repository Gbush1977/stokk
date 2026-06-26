import type { DashboardReport, InventoryItem } from "./types";
import { buildMockReorderDeficits, getCriticalCount, getStockHealthPercent } from "./inventoryMetrics";

export const MOCK_INVENTORY: InventoryItem[] = [
  { sku: "sku-1", brand: "Redken", line: "Shades EQ", shade: "09V", fullUnits: 9, partialFraction: 0, parLevel: 8 },
  { sku: "sku-2", brand: "L'Oréal Professionnel", line: "Majirel", shade: "6.3", fullUnits: 4, partialFraction: 0, parLevel: 8 },
  { sku: "sku-3", brand: "Wella Professionals", line: "Koleston Perfect", shade: "7/43", fullUnits: 10, partialFraction: 0, parLevel: 8 },
  { sku: "sku-4", brand: "Schwarzkopf", line: "Igora Royal", shade: "5-65", fullUnits: 2, partialFraction: 0, parLevel: 8 },
  { sku: "sku-5", brand: "Goldwell", line: "Topchic", shade: "6N", fullUnits: 5, partialFraction: 0, parLevel: 8 },
  { sku: "sku-6", brand: "Redken", line: "Shades EQ", shade: "7NA", fullUnits: 1, partialFraction: 0.5, parLevel: 6 },
  { sku: "sku-7", brand: "Wella Professionals", line: "Illumina Color", shade: "8/69", fullUnits: 7, partialFraction: 0, parLevel: 6 },
  { sku: "sku-8", brand: "L'Oréal Professionnel", line: "INOA", shade: "7.1", fullUnits: 2, partialFraction: 0, parLevel: 8 },
  { sku: "sku-9", brand: "Schwarzkopf", line: "Igora Royal", shade: "4-99", fullUnits: 3, partialFraction: 0, parLevel: 6 },
  { sku: "sku-10", brand: "Goldwell", line: "Elumen", shade: "BL@all", fullUnits: 6, partialFraction: 0, parLevel: 5 },
];

// Used when Supabase is unreachable (offline, no project configured) so the
// Dashboard always has something to render.
export const MOCK_REPORT: DashboardReport = {
  items: MOCK_INVENTORY,
  totalActiveItems: MOCK_INVENTORY.length,
  stockroomFullnessPercent: getStockHealthPercent(MOCK_INVENTORY),
  criticalCount: getCriticalCount(MOCK_INVENTORY),
  activeOrderSheet: buildMockReorderDeficits(MOCK_INVENTORY),
  pendingBudgetReview: [],
};
