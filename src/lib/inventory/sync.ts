import { supabase } from "../supabaseClient";
import type {
  InventorySyncResult,
  InventorySyncUnmatched,
  InventorySyncUpdate,
  ScanDetectionPayload,
  ScanMode,
} from "../types";

function hasIdentity(detection: ScanDetectionPayload): boolean {
  return Boolean(detection.brand && detection.line && detection.shadeCode) && detection.status !== "analyzing";
}

interface ProductRow {
  id: string;
  sku: string;
  brand: string;
  line: string;
  shade_code: string;
}

interface InventoryRow {
  product_id: string;
  full_quantity: number;
  partial_quantity: number;
}

// Runs each detection as a sequential, awaited read-then-write against
// Supabase. supabase-js has no client-side multi-statement transaction, but
// this is a single-stockroom tool with no concurrent-write contention, so
// sequential calls are safe in practice.
export async function syncInventory(scanMode: ScanMode, detections: ScanDetectionPayload[]): Promise<InventorySyncResult> {
  const updated: InventorySyncUpdate[] = [];
  const unmatched: InventorySyncUnmatched[] = [];

  for (const detection of detections) {
    if (!hasIdentity(detection)) continue;
    const { brand, line, shadeCode } = detection;

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, sku, brand, line, shade_code")
      .eq("brand", brand)
      .eq("line", line)
      .eq("shade_code", shadeCode)
      .maybeSingle<ProductRow>();

    if (productError) throw new Error(productError.message);

    if (!product) {
      unmatched.push({ brand, line, shadeCode });
      continue;
    }

    const fullQuantity = detection.fullQuantity ?? 1;
    const partialQuantity = detection.partialQuantity ?? 0;

    const inventory =
      scanMode === "shelf"
        ? await upsertShelfInventory(product.id, fullQuantity, partialQuantity, Boolean(detection.additive))
        : await syncColorTabUsage(product.id, fullQuantity, partialQuantity);

    updated.push({
      sku: product.sku,
      brand: product.brand,
      line: product.line,
      shadeCode: product.shade_code,
      fullQuantity: inventory.full_quantity,
      partialQuantity: inventory.partial_quantity,
    });
  }

  return { scanMode, updated, unmatched };
}

async function fetchInventory(productId: string): Promise<InventoryRow | null> {
  const { data, error } = await supabase
    .from("inventory")
    .select("product_id, full_quantity, partial_quantity")
    .eq("product_id", productId)
    .maybeSingle<InventoryRow>();

  if (error) throw new Error(error.message);
  return data;
}

async function upsertShelfInventory(
  productId: string,
  fullQuantity: number,
  partialQuantity: number,
  additive: boolean,
): Promise<InventoryRow> {
  const existing = await fetchInventory(productId);

  const nextFullQuantity = additive ? (existing?.full_quantity ?? 0) + fullQuantity : fullQuantity;
  const nextPartialQuantity = additive ? (existing?.partial_quantity ?? 0) + partialQuantity : partialQuantity;

  const { data, error } = await supabase
    .from("inventory")
    .upsert(
      {
        product_id: productId,
        full_quantity: nextFullQuantity,
        partial_quantity: nextPartialQuantity,
        last_scanned_at: new Date().toISOString(),
      },
      { onConflict: "product_id" },
    )
    .select("product_id, full_quantity, partial_quantity")
    .single<InventoryRow>();

  if (error) throw new Error(error.message);
  return data;
}

async function syncColorTabUsage(productId: string, fullQuantity: number, partialQuantity: number): Promise<InventoryRow> {
  const quantityUsed = fullQuantity + partialQuantity;

  const { error: historyError } = await supabase
    .from("consumption_history")
    .insert({ product_id: productId, quantity_used: quantityUsed, scan_mode: "color-tab" });

  if (historyError) throw new Error(historyError.message);

  const existing = await fetchInventory(productId);

  const { data, error } = await supabase
    .from("inventory")
    .upsert(
      {
        product_id: productId,
        full_quantity: Math.max((existing?.full_quantity ?? 0) - fullQuantity, 0),
        partial_quantity: Math.max((existing?.partial_quantity ?? 0) - partialQuantity, 0),
        last_scanned_at: new Date().toISOString(),
      },
      { onConflict: "product_id" },
    )
    .select("product_id, full_quantity, partial_quantity")
    .single<InventoryRow>();

  if (error) throw new Error(error.message);
  return data;
}
