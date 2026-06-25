import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../_lib/prisma.ts";
import type { InventoryReportItem, InventoryReportResponseBody, ReorderDeficit } from "../_lib/types.ts";
import { classifyAlertLevel, classifyVelocityTier, computeDaysSinceLastUse, computeVelocityPerWeek, computeWeeksOfSupplyRemaining } from "../../src/services/reorderVelocity.ts";
import { allocateOrderBudget } from "../../src/services/reorderBudget.ts";

const CRITICAL_THRESHOLD = 0.3;
const CONSUMPTION_LOOKBACK_DAYS = 90;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const allProducts = await prisma.product.findMany({ include: { inventory: true } });

    // Reference catalog products (seeded for Gemini shade-code matching) have
    // no Inventory row until a scan actually finds one on a shelf — exclude
    // them here so they don't show up as 0-stock "critical" deficits.
    const products = allProducts.filter((product) => product.inventory !== null);

    const cutoff = new Date(Date.now() - CONSUMPTION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const consumption = await prisma.consumptionHistory.findMany({
      where: { productId: { in: products.map((product) => product.id) }, recordedAt: { gte: cutoff } },
      select: { productId: true, quantityUsed: true, recordedAt: true },
    });

    const historyByProduct = new Map<string, { quantityUsed: number; recordedAt: Date }[]>();
    for (const row of consumption) {
      const rows = historyByProduct.get(row.productId) ?? [];
      rows.push({ quantityUsed: row.quantityUsed, recordedAt: row.recordedAt });
      historyByProduct.set(row.productId, rows);
    }

    // Unbounded by the lookback window, so a Slow Mover that hasn't sold in
    // 6 months still reports its true last-used date for the UI label.
    const latestUsage = await prisma.consumptionHistory.groupBy({
      by: ["productId"],
      where: { productId: { in: products.map((product) => product.id) } },
      _max: { recordedAt: true },
    });
    const lastUsedAtByProduct = new Map<string, Date>();
    for (const row of latestUsage) {
      if (row._max.recordedAt) lastUsedAtByProduct.set(row.productId, row._max.recordedAt);
    }

    const items: InventoryReportItem[] = [];
    const reorderDeficits: ReorderDeficit[] = [];
    let fullnessSum = 0;

    for (const product of products) {
      const fullUnits = product.inventory?.fullQuantity ?? 0;
      const partialFraction = product.inventory?.partialQuantity ?? 0;
      const currentStock = fullUnits + partialFraction;

      items.push({
        sku: product.sku,
        brand: product.brand,
        line: product.line,
        shadeCode: product.shadeCode,
        fullUnits,
        partialFraction,
        idealStockLevel: product.idealStockLevel,
      });

      fullnessSum += Math.min(currentStock / product.idealStockLevel, 1);

      const reorderQuantity = Math.max(product.idealStockLevel - currentStock, 0);
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
          shadeCode: product.shadeCode,
          currentStock,
          idealStockLevel: product.idealStockLevel,
          reorderQuantity,
          critical: currentStock <= product.idealStockLevel * CRITICAL_THRESHOLD,
          weeksOfSupplyRemaining,
          velocityTier,
          alertLevel,
          aiPredicted: alertLevel !== "none",
          budgetOverride: product.budgetOverride,
          daysSinceLastUse,
        });
      }
    }

    reorderDeficits.sort((a, b) => b.reorderQuantity - a.reorderQuantity);
    const { activeOrderSheet, pendingBudgetReview } = allocateOrderBudget(reorderDeficits);

    const body: InventoryReportResponseBody = {
      totalActiveItems: products.length,
      stockroomFullnessPercent: products.length === 0 ? 0 : Math.round((fullnessSum / products.length) * 100),
      criticalCount: reorderDeficits.filter((item) => item.critical).length,
      reorderDeficits,
      activeOrderSheet,
      pendingBudgetReview,
      items,
    };

    return res.status(200).json(body);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
}
