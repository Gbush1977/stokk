// Supabase Edge Function (Deno runtime). This is the one piece of backend
// logic that can't live in the browser: it needs the secret GEMINI_API_KEY,
// set via `supabase secrets set GEMINI_API_KEY=...` rather than a .env value.
import { GoogleGenAI, Type, type Part, type Schema } from "npm:@google/genai";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = Deno.env.get("GEMINI_SCAN_MODEL") ?? "gemini-2.5-flash";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ShelfScanImage {
  base64: string;
  mimeType: string;
}

interface GeminiScanItem {
  brand: string;
  line: string;
  shade_code: string;
  calculated_qty: number;
}

interface GeminiScanWarning {
  frameIndex: number;
  reason: string;
}

interface GeminiScanResult {
  items: GeminiScanItem[];
  warnings: GeminiScanWarning[];
}

class GeminiScanError extends Error {}

interface CatalogEntry {
  brand: string;
  line: string;
  shadeCode: string;
}

type DetectionStatus = "full" | "partial" | "low-stock" | "analyzing";

interface ScanDetectionPayload {
  brand: string;
  line: string;
  shadeCode: string;
  status: DetectionStatus;
  fullQuantity?: number;
  partialQuantity?: number;
}

const BASE_SYSTEM_INSTRUCTION = `You are a professional hairdressing stockroom assistant. You will receive a
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

const FULL_BOXES_ONLY_INSTRUCTION = `Completely ignore any opened, squeezed, or crumpled color tubes visible on
the shelf. Only return counts for sealed, structurally uniform box
packaging.`;

const GENERIC_CATALOG_NOTICE = `You are matching visual text against a pre-loaded database catalog
containing L'Oréal Majirel/Inoa, Wella Koleston/Illumina, Schwarzkopf Igora
Royal, Goldwell Topchic, Redken Shades EQ, and Aveda Full Spectrum. Map
whatever shade code you visually detect to the closest valid matching shade
from this catalog to guarantee 100% data integrity.`;

function buildCatalogSection(catalog: CatalogEntry[]): string {
  if (catalog.length === 0) {
    return GENERIC_CATALOG_NOTICE;
  }

  const byLine = new Map<string, Set<string>>();
  for (const entry of catalog) {
    const key = `${entry.brand} — ${entry.line}`;
    const shades = byLine.get(key) ?? new Set<string>();
    shades.add(entry.shadeCode);
    byLine.set(key, shades);
  }

  const lines = Array.from(byLine.entries()).map(
    ([key, shades]) => `- ${key}: ${Array.from(shades).join(", ")}`,
  );

  return `${GENERIC_CATALOG_NOTICE}

Valid catalog entries (brand — line: shade codes). This list is the exact,
complete master dictionary — these are the ONLY brand/line/shade combinations
that exist in the database. Every detection you report MUST strictly snap to
one of the entries below: if what you read is close to one of these but not
an exact character match, snap it to the nearest entry rather than inventing
a new code, and never report a brand, line, or shade code that is absent
from this list:
${lines.join("\n")}`;
}

function buildSystemInstruction(catalog: CatalogEntry[], countFullBoxesOnly: boolean): string {
  const sections = [BASE_SYSTEM_INSTRUCTION, buildCatalogSection(catalog)];
  if (countFullBoxesOnly) sections.push(FULL_BOXES_ONLY_INSTRUCTION);
  return sections.join("\n\n");
}

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

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new GeminiScanError("GEMINI_API_KEY is not configured for this Edge Function");
  }

  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

async function scanShelfImages(
  images: ShelfScanImage[],
  catalog: CatalogEntry[],
  countFullBoxesOnly: boolean,
): Promise<GeminiScanResult> {
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
        systemInstruction: buildSystemInstruction(catalog, countFullBoxesOnly),
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
      },
    });
    rawText = response.text;
  } catch (err) {
    throw new GeminiScanError(`Gemini request failed: ${err instanceof Error ? err.message : String(err)}`);
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

// Converts calculated_qty per tube into the fullQuantity/partialQuantity
// shape src/lib/inventory/sync.ts expects.
function toInventorySyncDetections(result: GeminiScanResult): ScanDetectionPayload[] {
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

interface ScanGeminiRequestBody {
  images: ShelfScanImage[];
  countFullBoxesOnly?: boolean;
}

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null);
  if (!isValidBody(body)) {
    return new Response(
      JSON.stringify({ error: "Expected { images: [{ base64, mimeType }, ...] }" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const { data: catalogRows, error: catalogError } = await supabaseClient
      .from("products")
      .select("brand, line, shade_code");

    if (catalogError) throw new GeminiScanError(catalogError.message);

    const catalog: CatalogEntry[] = (catalogRows ?? []).map((row) => ({
      brand: row.brand,
      line: row.line,
      shadeCode: row.shade_code,
    }));

    const result = await scanShelfImages(body.images, catalog, body.countFullBoxesOnly ?? false);

    return new Response(
      JSON.stringify({
        items: result.items,
        warnings: result.warnings,
        detections: toInventorySyncDetections(result),
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const status = err instanceof GeminiScanError ? 502 : 500;
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
