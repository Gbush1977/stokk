import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "./_lib/prisma.ts";
import type { ProductsSearchResponseBody } from "./_lib/types.ts";

const RESULT_LIMIT = 20;

// Backs the Manual Adjustment Drawer's shade search/select — searches the
// full catalog (not just stocked items) by brand, line, or shade code.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = new URLSearchParams(req.url?.split("?")[1] ?? "").get("q")?.trim() ?? "";

  try {
    const products = await prisma.product.findMany({
      where: query
        ? {
            OR: [
              { brand: { contains: query, mode: "insensitive" } },
              { line: { contains: query, mode: "insensitive" } },
              { shadeCode: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: { sku: true, brand: true, line: true, shadeCode: true },
      orderBy: [{ brand: "asc" }, { line: "asc" }, { shadeCode: "asc" }],
      take: RESULT_LIMIT,
    });

    const body: ProductsSearchResponseBody = { products };
    return res.status(200).json(body);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
}
