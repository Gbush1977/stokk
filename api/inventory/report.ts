import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../_lib/prisma.ts";
import type { InventoryReportResponseBody, ReorderDeficit } from "../_lib/types.ts";

const CRITICAL_THRESHOLD = 0.3;

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

    const reorderDeficits: ReorderDeficit[] = [];
    let fullnessSum = 0;

    for (const product of products) {
      const currentStock = (product.inventory?.fullQuantity ?? 0) + (product.inventory?.partialQuantity ?? 0);
      fullnessSum += Math.min(currentStock / product.idealStockLevel, 1);

      const reorderQuantity = Math.max(product.idealStockLevel - currentStock, 0);
      if (reorderQuantity > 0) {
        reorderDeficits.push({
          sku: product.sku,
          brand: product.brand,
          line: product.line,
          shadeCode: product.shadeCode,
          currentStock,
          idealStockLevel: product.idealStockLevel,
          reorderQuantity,
          critical: currentStock <= product.idealStockLevel * CRITICAL_THRESHOLD,
        });
      }
    }

    reorderDeficits.sort((a, b) => b.reorderQuantity - a.reorderQuantity);

    const body: InventoryReportResponseBody = {
      totalActiveItems: products.length,
      stockroomFullnessPercent: products.length === 0 ? 0 : Math.round((fullnessSum / products.length) * 100),
      criticalCount: reorderDeficits.filter((item) => item.critical).length,
      reorderDeficits,
    };

    return res.status(200).json(body);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
}
