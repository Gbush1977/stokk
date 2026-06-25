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
const CATALOG_PRODUCTS = [
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "4" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "5.3" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "7.11" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "6.34" },
  { brand: "L'Oréal Professionnel", line: "Majirel", shadeCode: "9.1" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "4" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "5.3" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "7.11" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "8.1" },
  { brand: "L'Oréal Professionnel", line: "INOA", shadeCode: "9" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "6/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "7/3" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "10/16" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "4/0" },
  { brand: "Wella Professionals", line: "Koleston Perfect", shadeCode: "8/96" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "6/0" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "7/3" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "10/16" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "5/0" },
  { brand: "Wella Professionals", line: "Illumina Color", shadeCode: "9/60" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "5-0" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "7-77" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "9-98" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "6-0" },
  { brand: "Schwarzkopf", line: "Igora Royal", shadeCode: "8-4" },
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

    await prisma.inventory.upsert({
      where: { productId: product.id },
      create: { productId: product.id, fullQuantity: item.fullQuantity, partialQuantity: 0 },
      update: { fullQuantity: item.fullQuantity },
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
