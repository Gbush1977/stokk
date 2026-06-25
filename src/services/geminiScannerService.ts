import { GoogleGenAI, Type, type Part, type Schema } from "@google/genai";
import type { DetectionStatus, ScanDetectionPayload } from "../../api/_lib/types.ts";

const MODEL = process.env.GEMINI_SCAN_MODEL ?? "gemini-2.5-flash";

export interface ShelfScanImage {
  base64: string;
  mimeType: string;
}

export interface GeminiScanItem {
  brand: string;
  line: string;
  shade_code: string;
  calculated_qty: number;
}

export interface GeminiScanWarning {
  frameIndex: number;
  reason: string;
}

export interface GeminiScanResult {
  items: GeminiScanItem[];
  warnings: GeminiScanWarning[];
}

export class GeminiScanError extends Error {}

const SYSTEM_INSTRUCTION = `You are a professional hairdressing stockroom assistant. You will receive a
sequence of photos of the same salon colour shelf or rack, taken left to right
(or top to bottom) so that consecutive photos overlap at their edges.

Treat the photos as one continuous sweep, not independent images:
1. Identify visual overlapping zones between consecutive images. If a product
   box, brand name, or shade code appears in the overlap of Image N and
   Image N+1, deduplicate it. Count each unique physical tube only once
   across the entire set of photos.
2. Use packaging cues (brand logo, line name, shade code, box wear, exact
   shelf position) to tell genuinely distinct tubes apart from the same tube
   seen twice.
3. For every unique tube, assess how full it visually appears and report
   that as calculated_qty: 1 for a full, unopened tube, fractional values
   such as 0.5 or 0.25 for partially used tubes judged by visible product
   remaining, and 0 only if a slot is visibly empty but should be tracked.
4. If a frame is too blurry, dark, or obstructed to confidently read a
   brand, line, or shade code, do not guess. Instead omit that item and add
   an entry to "warnings" naming the frame index (0-based, matching the
   order images were supplied) and the reason it could not be read.

Respond only with JSON matching the supplied schema. Never invent a brand,
line, or shade code you cannot actually read.`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          brand: { type: Type.STRING },
          line: { type: Type.STRING },
          shade_code: { type: Type.STRING },
          calculated_qty: { type: Type.NUMBER },
        },
        required: ["brand", "line", "shade_code", "calculated_qty"],
      },
    },
    warnings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          frameIndex: { type: Type.INTEGER },
          reason: { type: Type.STRING },
        },
        required: ["frameIndex", "reason"],
      },
    },
  },
  required: ["items", "warnings"],
};

let cachedClient: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiScanError("GEMINI_API_KEY is not configured on the server");
  }

  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

export async function scanShelfImages(images: ShelfScanImage[]): Promise<GeminiScanResult> {
  if (images.length === 0) {
    throw new GeminiScanError("At least one image is required to scan a shelf");
  }

  const ai = getClient();

  const parts: Part[] = images.flatMap((image, index) => [
    { text: `Image ${index} of ${images.length - 1} (sequence order, left to right):` },
    { inlineData: { mimeType: image.mimeType, data: image.base64 } },
  ]);

  let rawText: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: parts,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
      },
    });
    rawText = response.text;
  } catch (err) {
    throw new GeminiScanError(
      `Gemini request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!rawText) {
    throw new GeminiScanError("Gemini returned an empty response for this scan");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new GeminiScanError("Gemini returned a response that was not valid JSON");
  }

  return normalizeResult(parsed);
}

function normalizeResult(parsed: unknown): GeminiScanResult {
  if (!parsed || typeof parsed !== "object") {
    throw new GeminiScanError("Gemini response did not match the expected { items, warnings } shape");
  }

  const { items, warnings } = parsed as { items?: unknown; warnings?: unknown };
  if (!Array.isArray(items)) {
    throw new GeminiScanError("Gemini response is missing an items array");
  }

  const isItem = (value: unknown): value is GeminiScanItem => {
    if (!value || typeof value !== "object") return false;
    const item = value as Record<string, unknown>;
    return (
      typeof item.brand === "string" &&
      typeof item.line === "string" &&
      typeof item.shade_code === "string" &&
      typeof item.calculated_qty === "number" &&
      Number.isFinite(item.calculated_qty)
    );
  };

  const cleanItems: GeminiScanItem[] = items.filter(isItem).map((item) => ({
    brand: item.brand.trim(),
    line: item.line.trim(),
    shade_code: item.shade_code.trim(),
    calculated_qty: Math.max(item.calculated_qty, 0),
  }));

  const isWarning = (value: unknown): value is GeminiScanWarning => {
    if (!value || typeof value !== "object") return false;
    const warning = value as Record<string, unknown>;
    return typeof warning.reason === "string";
  };

  const cleanWarnings: GeminiScanWarning[] = Array.isArray(warnings)
    ? warnings.filter(isWarning).map((warning) => ({
        frameIndex: typeof warning.frameIndex === "number" ? warning.frameIndex : -1,
        reason: warning.reason.trim(),
      }))
    : [];

  return { items: cleanItems, warnings: cleanWarnings };
}

// Converts calculated_qty per tube into the fullQuantity/partialQuantity shape POST /api/inventory/sync expects.
export function toInventorySyncDetections(result: GeminiScanResult): ScanDetectionPayload[] {
  return result.items
    .filter((item) => item.calculated_qty > 0)
    .map((item) => {
      const fullQuantity = Math.floor(item.calculated_qty);
      const partialQuantity = Math.round((item.calculated_qty - fullQuantity) * 2) / 2;
      const status: DetectionStatus = fullQuantity > 0 ? "full" : "partial";

      return {
        brand: item.brand,
        line: item.line,
        shadeCode: item.shade_code,
        status,
        fullQuantity,
        partialQuantity,
      };
    });
}
