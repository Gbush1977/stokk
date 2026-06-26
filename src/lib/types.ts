export type ScanMode = "shelf" | "color-tab";

export type DetectionStatus = "full" | "partial" | "low-stock" | "analyzing";

export interface ScanDetectionPayload {
  brand: string;
  line: string;
  shadeCode: string;
  status: DetectionStatus;
  fullQuantity?: number;
  partialQuantity?: number;
  // When true (shelf scans only), fullQuantity/partialQuantity are added to
  // the existing balance instead of replacing it — used by the Manual
  // Adjustment Drawer to append a partial backbar tube it found by hand.
  additive?: boolean;
}

export interface InventorySyncUpdate {
  sku: string;
  brand: string;
  line: string;
  shadeCode: string;
  fullQuantity: number;
  partialQuantity: number;
}

export interface InventorySyncUnmatched {
  brand: string;
  line: string;
  shadeCode: string;
}

export interface InventorySyncResult {
  scanMode: ScanMode;
  updated: InventorySyncUpdate[];
  unmatched: InventorySyncUnmatched[];
}

export interface ReorderDeficit {
  sku: string;
  brand: string;
  line: string;
  shadeCode: string;
  currentStock: number;
  idealStockLevel: number;
  reorderQuantity: number;
  critical: boolean;
  // Predictive analytics derived from consumption_history.
  weeksOfSupplyRemaining: number | null;
  velocityTier: "high" | "medium" | "low";
  alertLevel: "urgent" | "warning" | "none";
  aiPredicted: boolean;
  // Unbounded by the velocity lookback window — null when there's no usage on
  // record at all. Powers the "Slow Mover (Used once in X months)" label.
  daysSinceLastUse: number | null;
  // Dynamic Budget Shield: whether a manager has manually force-approved a
  // low-velocity shade onto the active order sheet.
  budgetOverride: boolean;
}

export interface InventoryReportItem {
  sku: string;
  brand: string;
  line: string;
  shadeCode: string;
  fullUnits: number;
  partialFraction: number;
  idealStockLevel: number;
}

export interface InventoryReport {
  totalActiveItems: number;
  stockroomFullnessPercent: number;
  criticalCount: number;
  // Full combined list of every product under its ideal stock level
  // (activeOrderSheet + pendingBudgetReview), kept for backward compatibility.
  reorderDeficits: ReorderDeficit[];
  // Deficits prioritized for this week's wholesale order, high velocity first.
  activeOrderSheet: ReorderDeficit[];
  // Slow-moving deficits held back from the active order to preserve budget.
  pendingBudgetReview: ReorderDeficit[];
  items: InventoryReportItem[];
}

export interface ShelfScanImage {
  base64: string;
  mimeType: string;
}

export interface ProductSummary {
  sku: string;
  brand: string;
  line: string;
  shadeCode: string;
}

export interface GeminiScanItem {
  brand: string;
  line: string;
  shade_code: string;
  calculated_qty: number;
}

export interface GeminiScanWarning {
  frameIndex: number;
  reason: string;
}

export interface ScanGeminiResult {
  items: GeminiScanItem[];
  warnings: GeminiScanWarning[];
  detections: ScanDetectionPayload[];
}
