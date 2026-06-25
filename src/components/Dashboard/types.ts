export type StockStatus = "full" | "partial";

export interface InventoryItem {
  id: string;
  brand: string;
  line: string;
  shade: string;
  quantity: number;
  parLevel: number;
}

export interface ReorderEntry {
  item: InventoryItem;
  reorderQty: number;
  critical: boolean;
}
