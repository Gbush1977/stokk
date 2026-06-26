import { supabase } from "../supabaseClient";
import type { ProductSummary } from "../types";

const RESULT_LIMIT = 20;

interface ProductRow {
  sku: string;
  brand: string;
  line: string;
  shade_code: string;
}

// Backs the Manual Adjustment Drawer's shade search/select — searches the
// full catalog (not just stocked items) by brand, line, or shade code.
export async function searchProducts(query: string): Promise<ProductSummary[]> {
  let builder = supabase
    .from("products")
    .select("sku, brand, line, shade_code")
    .order("brand", { ascending: true })
    .order("line", { ascending: true })
    .order("shade_code", { ascending: true })
    .limit(RESULT_LIMIT);

  const trimmed = query.trim();
  if (trimmed) {
    const escaped = trimmed.replace(/[%,]/g, "");
    builder = builder.or(`brand.ilike.%${escaped}%,line.ilike.%${escaped}%,shade_code.ilike.%${escaped}%`);
  }

  const { data, error } = await builder.returns<ProductRow[]>();
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    sku: row.sku,
    brand: row.brand,
    line: row.line,
    shadeCode: row.shade_code,
  }));
}
