export type DetectionStatus = "full" | "partial" | "low-stock" | "analyzing";

export type ScanMode = "shelf" | "color-tab";

export interface BoxPosition {
  top: string;
  left: string;
  width: string;
  height: string;
}

export interface Detection {
  id: string;
  brand: string;
  product: string;
  status: DetectionStatus;
  confidence: number;
  position: BoxPosition;
}
