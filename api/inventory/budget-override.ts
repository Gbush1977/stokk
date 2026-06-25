import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../_lib/prisma.ts";

interface BudgetOverrideRequestBody {
  sku: string;
  approved: boolean;
}

function isValidBody(body: unknown): body is BudgetOverrideRequestBody {
  if (!body || typeof body !== "object") return false;
  const { sku, approved } = body as BudgetOverrideRequestBody;
  return typeof sku === "string" && sku.length > 0 && typeof approved === "boolean";
}

// Lets a manager force-approve a "Slow Mover" shade onto the active weekly
// order sheet, overriding the Dynamic Budget Shield's low-velocity hold.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isValidBody(req.body)) {
    return res.status(400).json({ error: "Expected { sku: string, approved: boolean }" });
  }

  const { sku, approved } = req.body;

  try {
    const product = await prisma.product.update({
      where: { sku },
      data: { budgetOverride: approved },
    });

    return res.status(200).json({ sku: product.sku, budgetOverride: product.budgetOverride });
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : "Product not found" });
  }
}
