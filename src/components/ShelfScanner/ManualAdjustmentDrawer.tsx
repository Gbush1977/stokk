import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, Search, X } from "lucide-react";
import type { ProductSummary } from "../../lib/types";
import { searchProducts } from "../../lib/inventory/products";
import { syncInventory } from "../../lib/inventory/sync";

interface ManualAdjustmentDrawerProps {
  open: boolean;
  onClose: () => void;
  onLogged?: () => void;
}

const FRACTIONS = [0.25, 0.5, 0.75] as const;

export default function ManualAdjustmentDrawer({ open, onClose, onLogged }: ManualAdjustmentDrawerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<ProductSummary | null>(null);
  const [fraction, setFraction] = useState<number>(0.5);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedShade, setSavedShade] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSelected(null);
    setFraction(0.5);
    setSaveError(null);
    setSavedShade(null);
  }, [open]);

  useEffect(() => {
    if (!open || selected) return;

    const handle = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const products = await searchProducts(query);
        setResults(products);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [open, query, selected]);

  const handleLog = async () => {
    if (!selected || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await syncInventory("shelf", [
        {
          brand: selected.brand,
          line: selected.line,
          shadeCode: selected.shadeCode,
          status: "partial",
          fullQuantity: 0,
          partialQuantity: fraction,
          additive: true,
        },
      ]);

      setSavedShade(selected.shadeCode);
      setSelected(null);
      setQuery("");
      setResults([]);
      onLogged?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not reach the inventory service");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <div className="relative z-10 max-h-[80%] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-zinc-900 px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3 text-white shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-wide">Log Partial Backbar Stock</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition active:scale-90"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {savedShade && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/40 bg-mint/10 px-3 py-2 text-[12px] font-medium text-mint">
            <CheckCircle2 size={14} className="shrink-0" strokeWidth={2.5} />
            <span>Logged {fraction} tube of {savedShade}. You can log another below.</span>
          </div>
        )}

        {!selected ? (
          <>
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              <Search size={16} className="shrink-0 text-white/50" strokeWidth={2} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search brand, line, or shade code…"
                className="w-full bg-transparent text-[13px] text-white placeholder:text-white/40 focus:outline-none"
                autoFocus
              />
              {isSearching && <Loader2 size={14} className="shrink-0 animate-spin text-white/50" />}
            </div>

            <div className="flex flex-col gap-1.5">
              {results.length === 0 && !isSearching && (
                <p className="px-1 py-2 text-[12px] text-white/40">
                  {query ? "No matching shades found." : "Start typing to search the catalog."}
                </p>
              )}
              {results.map((product) => (
                <button
                  key={product.sku}
                  type="button"
                  onClick={() => setSelected(product)}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition active:scale-[0.98] active:bg-white/10"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-white">
                      {product.brand} — {product.line}
                    </span>
                    <span className="block truncate text-[11px] text-white/50">Shade {product.shadeCode}</span>
                  </span>
                  <ChevronDown size={14} className="shrink-0 -rotate-90 text-white/40" strokeWidth={2.5} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-electric/40 bg-electric/10 px-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-white">
                  {selected.brand} — {selected.line}
                </span>
                <span className="block truncate text-[11px] text-white/60">Shade {selected.shadeCode}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="shrink-0 text-[11px] font-semibold text-electric"
              >
                Change
              </button>
            </div>

            <div>
              <p className="mb-2 text-[12px] font-medium text-white/70">How much of this tube is left?</p>
              <div className="flex gap-2">
                {FRACTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFraction(value)}
                    aria-pressed={fraction === value}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition active:scale-95 ${
                      fraction === value
                        ? "border-electric bg-electric text-white"
                        : "border-white/10 bg-white/5 text-white/70"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {saveError && (
              <p className="text-[12px] font-medium text-rose-300">{saveError}</p>
            )}

            <button
              type="button"
              onClick={handleLog}
              disabled={isSaving}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-electric px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-electric/30 transition active:scale-[0.98] disabled:opacity-70"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" strokeWidth={2.5} />}
              {isSaving ? "Logging…" : "Add to inventory"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
