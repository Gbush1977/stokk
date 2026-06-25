import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GeminiScanError, scanShelfImages, toInventorySyncDetections } from "../src/services/geminiScannerService.ts";
import { prisma } from "./_lib/prisma.ts";
import type { ScanGeminiRequestBody, ScanGeminiResponseBody } from "./_lib/types.ts";

function isValidBody(body: unknown): body is ScanGeminiRequestBody {
  if (!body || typeof body !== "object") return false;
  const { images } = body as ScanGeminiRequestBody;
  return (
    Array.isArray(images) &&
    images.length > 0 &&
    images.every(
      (image) =>
        Boolean(image) &&
        typeof image === "object" &&
        typeof image.base64 === "string" &&
        typeof image.mimeType === "string",
    )
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isValidBody(req.body)) {
    return res.status(400).json({ error: "Expected { images: [{ base64, mimeType }, ...] }" });
  }

  try {
    const catalog = await prisma.product.findMany({
      select: { brand: true, line: true, shadeCode: true },
    });
    const result = await scanShelfImages(req.body.images, catalog);

    const body: ScanGeminiResponseBody = {
      items: result.items,
      warnings: result.warnings,
      detections: toInventorySyncDetections(result),
    };

    return res.status(200).json(body);
  } catch (err) {
    if (err instanceof GeminiScanError) {
      return res.status(502).json({ error: err.message });
    }
    return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
}
