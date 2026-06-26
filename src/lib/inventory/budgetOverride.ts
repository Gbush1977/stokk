import { supabase } from "../supabaseClient";

// Lets a manager force-approve a "Slow Mover" shade onto the active weekly
// order sheet, overriding the Dynamic Budget Shield's low-velocity hold.
export async function setBudgetOverride(sku: string, approved: boolean): Promise<void> {
  const { error } = await supabase.from("products").update({ budget_override: approved }).eq("sku", sku);
  if (error) throw new Error(error.message);
}
