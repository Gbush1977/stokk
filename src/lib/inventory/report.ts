import { supabase } from "../supabaseClient";
import {
  classifyAlertLevel,
  classifyVelocityTier,
  computeDaysSinceLastUse,
  computeVelocityPerWeek,
  computeWeeksOfSupplyRemaining,
  type ConsumptionRecord,
} from "../../services/reorderVelocity";
import { allocateOrderBudget } from "../../services/reorderBudget";
import type { InventoryReport, InventoryReportItem, ReorderDeficit } from "../types";

const CRITICAL_THRESHOLD = 0.3;
const CONSUMPTION_LOOKBACK_DAYS = 90;

interface StockedProductRow {
  full_quantity: number;
  partial_quantity: number;
  products: {
    id: string;
    sku: string;
    brand: string;
    line: string;
    shade_code: string;
    ideal_stock_level: number;
    budget_override: boolean;
  };
}

interface ConsumptionRow {
  product_id: string;
  quantity_used: number;
  recorded_at: string;
}

export async function fetchInventoryReport(): Promise<InventoryReport> {
  // Querying from inventory (not products) is what naturally excludes
  // catalog-only reference products: they have no inventory row at all, so
  // they never appear as 0-stock "critical" deficits.
  const { data: stocked, error: stockedError } = await supabase
    .from("inventory")
    .select(
      "full_quantity, partial_quantity, products(id, sku, brand, line, shade_code, ideal_stock_level, budget_override)",
    )
    .returns<StockedProductRow[]>();

  if (stockedError) throw new Error(stockedError.message);

  const rows = stocked ?? [];
  const productIds = rows.map((row) => row.products.id);

  // Fetched unbounded (not filtered to the 90-day lookback) so the "Slow
  // Mover (Used once in X months)" label can report a true last-used date
  // even when it falls outside the velocity window.
  const { data: consumption, error: consumptionError } =
    productIds.length === 0
      ? { data: [] as ConsumptionRow[], error: null }
      : await supabase
          .from("consumption_history")
          .select("product_id, quantity_used, recorded_at")
          .in("product_id", productIds)
          .returns<ConsumptionRow[]>();

  if (consumptionError) throw new Error(consumptionError.message);

  const cutoff = new Date(Date.now() - CONSUMPTION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const historyByProduct = new Map<string, ConsumptionRecord[]>();
  const lastUsedAtByProduct = new Map<string, Date>();

  for (const row of consumption ?? []) {
    const recordedAt = new Date(row.recorded_at);

    if (recordedAt >= cutoff) {
      const history = historyByProduct.get(row.product_id) ?? [];
      history.push({ quantityUsed: row.quantity_used, recordedAt });
      historyByProduct.set(row.product_id, history);
    }

    const lastUsed = lastUsedAtByProduct.get(row.product_id);
    if (!lastUsed || recordedAt > lastUsed) lastUsedAtByProduct.set(row.product_id, recordedAt);
  }

  const items: InventoryReportItem[] = [];
  const reorderDeficits: ReorderDeficit[] = [];
  let fullnessSum = 0;

  for (const row of rows) {
    const product = row.products;
    const fullUnits = row.full_quantity;
    const partialFraction = row.partial_quantity;
    const currentStock = fullUnits + partialFraction;

    items.push({
      sku: product.sku,
      brand: product.brand,
      line: product.line,
      shadeCode: product.shade_code,
      fullUnits,
      partialFraction,
      idealStockLevel: product.ideal_stock_level,
    });

    fullnessSum += Math.min(currentStock / product.ideal_stock_level, 1);

    const reorderQuantity = Math.max(product.ideal_stock_level - currentStock, 0);
    if (reorderQuantity > 0) {
      const history = historyByProduct.get(product.id) ?? [];
      const velocityTier = classifyVelocityTier(history);
      const velocityPerWeek = computeVelocityPerWeek(history);
      const weeksOfSupplyRemaining = computeWeeksOfSupplyRemaining(currentStock, velocityPerWeek);
      const alertLevel = classifyAlertLevel(weeksOfSupplyRemaining, velocityTier);
      const daysSinceLastUse = computeDaysSinceLastUse(lastUsedAtByProduct.get(product.id) ?? null);

      reorderDeficits.push({
        sku: product.sku,
        brand: product.brand,
        line: product.line,
        shadeCode: product.shade_code,
        currentStock,
        idealStockLevel: product.ideal_stock_level,
        reorderQuantity,
        critical: currentStock <= product.ideal_stock_level * CRITICAL_THRESHOLD,
        weeksOfSupplyRemaining,
        velocityTier,
        alertLevel,
        aiPredicted: alertLevel !== "none",
        budgetOverride: product.budget_override,
        daysSinceLastUse,
      });
    }
  }

  reorderDeficits.sort((a, b) => b.reorderQuantity - a.reorderQuantity);
  const { activeOrderSheet, pendingBudgetReview } = allocateOrderBudget(reorderDeficits);

  return {
    totalActiveItems: rows.length,
    stockroomFullnessPercent: rows.length === 0 ? 0 : Math.round((fullnessSum / rows.length) * 100),
    criticalCount: reorderDeficits.filter((item) => item.critical).length,
    reorderDeficits,
    activeOrderSheet,
    pendingBudgetReview,
    items,
  };
}
