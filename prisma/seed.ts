import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const SEED_PRODUCTS = [
  { brand: "Redken", line: "Shades EQ", shadeCode: "09V", fullQuantity: 9, idealStockLevel: 8 },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "6.3", fullQuantity: 4, idealStockLevel: 8 },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "7/43", fullQuantity: 10, idealStockLevel: 8 },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "5-65", fullQuantity: 2, idealStockLevel: 8 },
  { brand: "Goldwell", line: "Topchic", shadeCode: "6N", fullQuantity: 5, idealStockLevel: 8 },
  { brand: "Redken", line: "Shades EQ", shadeCode: "7NA", fullQuantity: 1, idealStockLevel: 6 },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "8/69", fullQuantity: 7, idealStockLevel: 6 },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "7.1", fullQuantity: 2, idealStockLevel: 8 },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "4-99", fullQuantity: 3, idealStockLevel: 6 },
  { brand: "Goldwell", line: "Elumen", shadeCode: "BL@all", fullQuantity: 6, idealStockLevel: 5 },
];

// Reference catalog so Gemini scans can be matched/snapped against known valid
// shade codes even before a tube has ever been physically scanned. These get a
// Product row only — no Inventory row — until a scan actually finds one on a
// shelf, so they don't appear as 0-stock "critical" items on the live report.
//
// Master list sourced from each brand's real professional shade-code
// convention (dots for L'Oréal, slashes for Wella, dashes for Schwarzkopf,
// letters for Goldwell, alphanumeric for Redken). Two notes on fidelity:
// - Schwarzkopf's European decimal-comma "9,5-1" half-depth is normalized to
//   "9.5-1" to match this schema's dot/dash convention.
// - Aveda's word-based "tone templates" (e.g. "ORANGE/RED") and Toni & Guy /
//   label.m / yuv's modifier suffixes aren't real catalog shade codes on
//   their own — only the well-formed, verifiable codes from those brands are
//   included below, so the Gemini "strict snap" prompt never gets pointed at
//   fabricated data.
const CATALOG_PRODUCTS = [
  // L'Oréal Professionnel — Majirel: Natural series
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "1" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "3" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "4" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "5" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "6" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "7" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "8" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "9" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "10" },
  // L'Oréal Professionnel — Majirel: Deep Naturals (.0 series)
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "4.0" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "5.0" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "6.0" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "7.0" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "8.0" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "4.20" },
  // L'Oréal Professionnel — Majirel: Ash/Iridescent
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "7.1" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "7.11" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "7.12" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "7.21" },
  // L'Oréal Professionnel — Majirel: Gold/Copper
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "7.3" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "7.32" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "7.4" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "7.43" },
  // L'Oréal Professionnel — Majirel: previously seeded extras
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "5.3" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "6.34" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "9.1" },
  // L'Oréal Professionnel — Majirel & Majirouge: master list additions
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "5.12" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "8.11" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "9.11" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "10.1" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "10.21" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "4.35" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "5.32" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "5.4" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "5.52" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "5.60" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "6.32" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "6.45" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "6.66" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "7.31" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "7.44" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "8.34" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "8.43" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "9.3" },
  // L'Oréal Professionnel — INOA
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "4" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "5.3" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "7.11" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "8.1" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "9" },
  // L'Oréal Professionnel — INOA (Ammonia-Free): master list additions
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "1" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "3" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "5" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "6" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "7" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "8" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "10" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "4.3" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "6.3" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "7.3" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "8.3" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "9.3" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "5.18" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "7.18" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "5.11" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "9.11" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "4.20" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "5.25" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "6.46" },
  // Wella Professionals — Koleston Perfect: Pure Naturals
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "2/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "3/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "4/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "5/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "6/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "7/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "8/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "9/0" },
  // Wella Professionals — Koleston Perfect: Rich Naturals
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "6/1" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "6/11" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "6/16" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "6/17" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "6/38" },
  // Wella Professionals — Koleston Perfect: Vibrant Reds
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "6/4" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "6/43" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "6/44" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "6/45" },
  // Wella Professionals — Koleston Perfect: previously seeded extras
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "7/3" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "10/16" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "8/96" },
  // Wella Professionals — Koleston Perfect Me+: master list additions
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "10/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "33/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "44/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "55/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "66/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "77/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "88/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "99/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "4/07" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "5/07" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "6/07" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "7/07" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "8/07" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "5/18" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "6/91" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "7/1" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "7/17" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "7/18" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "8/1" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "8/97" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "9/1" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "9/16" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "9/17" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "9/38" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "9/81" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "10/1" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "10/3" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "10/31" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "10/96" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "44/44" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "44/65" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "55/46" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "55/65" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "66/44" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "66/46" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "77/44" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "77/46" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "99/44" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "0/11" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "0/28" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "0/33" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "0/44" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "0/66" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "0/88" },
  // Wella Professionals — Illumina Color
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "6/0" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "7/3" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "10/16" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "5/0" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "9/60" },
  // Wella Professionals — Illumina Color: master list additions
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "5/" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "6/" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "7/" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "8/" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "9/" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "10/" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "5/7" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "7/7" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "9/7" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "5/81" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "7/81" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "9/81" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "10/81" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "6/16" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "8/16" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "5/35" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "7/35" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "9/03" },
  // Schwarzkopf — Igora Royal: Natural series
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-0" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-00" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-1" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-4" },
  // Schwarzkopf — Igora Royal: Fashion tones
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-5" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-7" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-77" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-88" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-98" },
  // Schwarzkopf — Igora Royal: previously seeded extras
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "5-0" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "7-77" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "9-98" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "8-4" },
  // Schwarzkopf — Igora Royal: master list additions
  // ("9,5-1" from the brief normalized to "9.5-1" to match this schema's dot/dash convention)
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "1-0" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "3-0" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "4-0" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "5-00" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "7-0" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "7-00" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "8-0" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "9-0" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "10-0" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "5-1" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-12" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "7-1" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "7-12" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "8-1" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "8-11" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "9-1" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "9-11" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "5-6" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-6" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-63" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-65" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-68" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "5-7" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "7-7" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "8-77" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "4-88" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "5-88" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "9.5-1" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "0-11" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "0-55" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "0-77" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "0-88" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "0-99" },
  // Goldwell — Topchic / Colorance: master list (brand's letter-coded tone system)
  { brand: "Goldwell", line: "Topchic", shadeCode: "2N" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "3N" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "4N" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "5N" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "7N" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "8N" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "9N" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "10N" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "3NN" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "4NN" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "5NN" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "6NN" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "7NN" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "8NN" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "9NN" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "4NA" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "5NA" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "6NA" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "7NA" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "8NA" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "9NA" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "7SB" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "8SB" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "9SB" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "6A" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "7A" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "8A" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "9A" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "5GB" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "6GB" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "7GB" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "8GB" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "9GB" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "6B" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "7B" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "8B" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "9B" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "7KG" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "8KG" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "9KG" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "6KR" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "7KR" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "5R" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "6R" },
  { brand: "Goldwell", line: "Topchic", shadeCode: "7RRmax" },
  // Redken — Shades EQ Gloss: master list (zero-padded depth + tone letter code)
  { brand: "Redken", line: "Shades EQ", shadeCode: "01B" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "03N" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "03NW" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "04N" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "05N" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "06N" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "06NB" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "06GB" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "06GG" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "07N" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "07NB" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "07G" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "07GR" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "08N" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "08GG" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "09N" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "09NB" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "09G" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "09GB" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "09T" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "09AA" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "010N" },
  { brand: "Redken", line: "Shades EQ", shadeCode: "010VV" },
  // Aveda — Full Spectrum Permanent: only the brand's standard depth/reflect
  // naturals are seeded here (e.g. "5N"). The brief's word-based "tone
  // templates" (ORANGE/RED, B/G, etc.) aren't real Aveda shade codes, so they
  // are intentionally omitted rather than fabricated into the catalog.
  { brand: "Aveda", line: "Full Spectrum", shadeCode: "1N" },
  { brand: "Aveda", line: "Full Spectrum", shadeCode: "2N" },
  { brand: "Aveda", line: "Full Spectrum", shadeCode: "3N" },
  { brand: "Aveda", line: "Full Spectrum", shadeCode: "4N" },
  { brand: "Aveda", line: "Full Spectrum", shadeCode: "5N" },
  { brand: "Aveda", line: "Full Spectrum", shadeCode: "6N" },
  { brand: "Aveda", line: "Full Spectrum", shadeCode: "7N" },
  { brand: "Aveda", line: "Full Spectrum", shadeCode: "8N" },
  { brand: "Aveda", line: "Full Spectrum", shadeCode: "9N" },
  { brand: "Aveda", line: "Full Spectrum", shadeCode: "10N" },
  // yuv — Custom System: only the literal "Base-N" depth scale (1-10) from
  // the brief is seeded. The Ref-Ash/Gold/Copper/Red modifiers were given as
  // bare suffixes, not full shade codes, and yuv's real combined-code format
  // couldn't be verified, so cross-producing them would mean inventing
  // catalog entries rather than seeding real ones.
  { brand: "yuv", line: "Custom System", shadeCode: "1" },
  { brand: "yuv", line: "Custom System", shadeCode: "2" },
  { brand: "yuv", line: "Custom System", shadeCode: "3" },
  { brand: "yuv", line: "Custom System", shadeCode: "4" },
  { brand: "yuv", line: "Custom System", shadeCode: "5" },
  { brand: "yuv", line: "Custom System", shadeCode: "6" },
  { brand: "yuv", line: "Custom System", shadeCode: "7" },
  { brand: "yuv", line: "Custom System", shadeCode: "8" },
  { brand: "yuv", line: "Custom System", shadeCode: "9" },
  { brand: "yuv", line: "Custom System", shadeCode: "10" },
];

const CATALOG_IDEAL_STOCK_LEVEL = 4;

async function main() {
  for (const item of SEED_PRODUCTS) {
    const sku = slugify(`${item.brand}-${item.line}-${item.shadeCode}`);
    const product = await prisma.product.upsert({
      where: { sku },
      create: { brand: item.brand, line: item.line, shadeCode: item.shadeCode, sku, idealStockLevel: item.idealStockLevel },
      update: { idealStockLevel: item.idealStockLevel },
    });

    // update: {} is intentional — re-running the seed must never overwrite
    // live scanned inventory balances, it only needs to create the row once.
    await prisma.inventory.upsert({
      where: { productId: product.id },
      create: { productId: product.id, fullQuantity: item.fullQuantity, partialQuantity: 0 },
      update: {},
    });
  }

  for (const item of CATALOG_PRODUCTS) {
    const sku = slugify(`${item.brand}-${item.line}-${item.shadeCode}`);
    await prisma.product.upsert({
      where: { sku },
      create: {
        brand: item.brand,
        line: item.line,
        shadeCode: item.shadeCode,
        sku,
        idealStockLevel: CATALOG_IDEAL_STOCK_LEVEL,
      },
      update: {},
    });
  }

  console.log(`Seeded ${SEED_PRODUCTS.length} stocked products and ${CATALOG_PRODUCTS.length} catalog reference products.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
