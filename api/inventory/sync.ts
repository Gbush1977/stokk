import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../_lib/prisma.ts";
import type {
  InventorySyncRequestBody,
  InventorySyncResponseBody,
  InventorySyncUnmatched,
  InventorySyncUpdate,
  ScanDetectionPayload,
} from "../_lib/types.ts";

function isValidBody(body: unknown): body is InventorySyncRequestBody {
  if (!body || typeof body !== "object") return false;
  const { scanMode, detections } = body as InventorySyncRequestBody;
  return (scanMode === "shelf" || scanMode === "color-tab") && Array.isArray(detections);
}

function hasIdentity(detection: ScanDetectionPayload): boolean {
  return Boolean(detection.brand && detection.line && detection.shadeCode) && detection.status !== "analyzing";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isValidBody(req.body)) {
    return res.status(400).json({ error: "Expected { scanMode: 'shelf' | 'color-tab', detections: [...] }" });
  }

  const { scanMode, detections } = req.body;
  const updated: InventorySyncUpdate[] = [];
  const unmatched: InventorySyncUnmatched[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      for (const detection of detections) {
        if (!hasIdentity(detection)) continue;
        const { brand, line, shadeCode } = detection;

        const product = await tx.product.findUnique({
          where: { brand_line_shadeCode: { brand, line, shadeCode } },
        });

        if (!product) {
          unmatched.push({ brand, line, shadeCode });
          continue;
        }

        const fullQuantity = detection.fullQuantity ?? 1;
        const partialQuantity = detection.partialQuantity ?? 0;

        const inventory =
          scanMode === "shelf"
            ? detection.additive
              ? await tx.inventory.upsert({
                  where: { productId: product.id },
                  create: { productId: product.id, fullQuantity, partialQuantity, lastScannedAt: new Date() },
                  update: {
                    fullQuantity: { increment: fullQuantity },
                    partialQuantity: { increment: partialQuantity },
                    lastScannedAt: new Date(),
                  },
                })
              : await tx.inventory.upsert({
                  where: { productId: product.id },
                  create: { productId: product.id, fullQuantity, partialQuantity, lastScannedAt: new Date() },
                  update: { fullQuantity, partialQuantity, lastScannedAt: new Date() },
                })
            : await syncColorTabUsage(tx, product.id, fullQuantity, partialQuantity);

        updated.push({
          sku: product.sku,
          brand: product.brand,
          line: product.line,
          shadeCode: product.shadeCode,
          fullQuantity: inventory.fullQuantity,
          partialQuantity: inventory.partialQuantity,
        });
      }
    });

    const body: InventorySyncResponseBody = { scanMode, updated, unmatched };
    return res.status(200).json(body);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
}

async function syncColorTabUsage(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  productId: string,
  fullQuantity: number,
  partialQuantity: number,
) {
  const quantityUsed = fullQuantity + partialQuantity;

  await tx.consumptionHistory.create({
    data: { productId, quantityUsed, scanMode: "color-tab" },
  });

  const existing = await tx.inventory.findUnique({ where: { productId } });

  return tx.inventory.upsert({
    where: { productId },
    create: { productId, fullQuantity: 0, partialQuantity: 0, lastScannedAt: new Date() },
    update: {
      fullQuantity: Math.max((existing?.fullQuantity ?? 0) - fullQuantity, 0),
      partialQuantity: Math.max((existing?.partialQuantity ?? 0) - partialQuantity, 0),
      lastScannedAt: new Date(),
    },
  });
}
