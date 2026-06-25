export type ScanMode = "shelf" | "color-tab";

export type DetectionStatus = "full" | "partial" | "low-stock" | "analyzing";

export interface ScanDetectionPayload {
  brand: string;
  line: string;
  shadeCode: string;
  status: DetectionStatus;
  fullQuantity?: number;
  partialQuantity?: number;
}

export interface InventorySyncRequestBody {
  scanMode: ScanMode;
  detections: ScanDetectionPayload[];
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

export interface InventorySyncResponseBody {
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
}

export interface InventoryReportResponseBody {
  totalActiveItems: number;
  stockroomFullnessPercent: number;
  criticalCount: number;
  reorderDeficits: ReorderDeficit[];
}
