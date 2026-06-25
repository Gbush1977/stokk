import { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, ChevronDown, Download, ShieldAlert } from "lucide-react";
import type { ReorderDeficit } from "./types";
import Toast from "../Toast";

interface ReorderSheetProps {
  activeOrderSheet: ReorderDeficit[];
  pendingBudgetReview: ReorderDeficit[];
  onOverride: (sku: string, approved: boolean) => void;
}

const CSV_HEADER = "Brand,Product Line,Shade Code,Current Stock,Ideal Stock Level,Recommended Order Quantity";

function exportOrderSheet(deficits: ReorderDeficit[]) {
  const rows = deficits.map(
    (d) => `${d.brand},${d.line},${d.shadeCode},${d.currentStock},${d.idealStockLevel},${d.reorderQuantity}`,
  );
  const csv = [CSV_HEADER, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "stokk_reorder_sheet.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function AlertBadge({ deficit }: { deficit: ReorderDeficit }) {
  if (deficit.alertLevel === "none") return null;

  const isUrgent = deficit.alertLevel === "urgent";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isUrgent ? "bg-rose-400/15 text-rose-300" : "bg-amber-300/15 text-amber-200"
      }`}
    >
      {isUrgent ? <AlertTriangle size={11} strokeWidth={2.5} /> : <ShieldAlert size={11} strokeWidth={2.5} />}
      {deficit.weeksOfSupplyRemaining !== null
        ? `${deficit.weeksOfSupplyRemaining.toFixed(1)} wks supply`
        : isUrgent
          ? "Urgent"
          : "Low supply"}
    </span>
  );
}

function DeficitRow({ deficit }: { deficit: ReorderDeficit }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">
          {deficit.critical && <AlertCircle size={13} className="shrink-0 text-rose-300" />}
          <span className="truncate">
            {deficit.brand} {deficit.line}
          </span>
        </p>
        <p className="truncate text-[11px] text-white/45">
          {deficit.shadeCode} · {deficit.currentStock} in stock · Target {deficit.idealStockLevel}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <AlertBadge deficit={deficit} />
          {deficit.aiPredicted && (
            <span className="text-[10px] font-medium italic text-white/35">
              AI Predicted Deficit – Verify physically before ordering.
            </span>
          )}
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-electric/15 px-2.5 py-1 text-[12px] font-semibold text-electric">
        Reorder: {deficit.reorderQuantity}
      </span>
    </div>
  );
}

function slowMoverLabel(deficit: ReorderDeficit): string {
  const months = deficit.daysSinceLastUse !== null ? Math.max(Math.round(deficit.daysSinceLastUse / 30), 1) : null;
  const usageClause = months !== null ? `Used once in ${months} month${months === 1 ? "" : "s"}` : "No recent usage";
  return `Slow Mover (${usageClause}) — Holding to preserve weekly color budget.`;
}

function SlowMoverRow({ deficit, onOverride }: { deficit: ReorderDeficit; onOverride: (sku: string, approved: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">
          {deficit.brand} {deficit.line}
        </p>
        <p className="truncate text-[11px] text-white/45">
          {deficit.shadeCode} · {deficit.currentStock} in stock · Target {deficit.idealStockLevel}
        </p>
        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
          <ChevronDown size={11} strokeWidth={2.5} />
          {slowMoverLabel(deficit)}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onOverride(deficit.sku, !deficit.budgetOverride)}
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
          deficit.budgetOverride ? "bg-electric text-white" : "bg-white/10 text-white/70"
        }`}
      >
        {deficit.budgetOverride ? "Force-approved" : "Force approve"}
      </button>
    </div>
  );
}

export default function ReorderSheet({ activeOrderSheet, pendingBudgetReview, onOverride }: ReorderSheetProps) {
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeout = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) window.clearTimeout(toastTimeout.current);
    };
  }, []);

  const handleExport = () => {
    exportOrderSheet(activeOrderSheet);
    setToastVisible(true);
    if (toastTimeout.current) window.clearTimeout(toastTimeout.current);
    toastTimeout.current = window.setTimeout(() => setToastVisible(false), 2600);
  };

  if (activeOrderSheet.length === 0 && pendingBudgetReview.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/50 backdrop-blur-md">
        All shelves are fully stocked. Nothing to reorder.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Toast message="Order Sheet Exported Successfully!" visible={toastVisible} />

      {activeOrderSheet.length > 0 && (
        <div className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          {activeOrderSheet.map((deficit) => (
            <DeficitRow key={deficit.sku} deficit={deficit} />
          ))}
        </div>
      )}

      {activeOrderSheet.length > 0 && (
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center justify-center gap-2 rounded-xl bg-electric py-3 text-sm font-semibold text-white shadow-lg shadow-electric/30 transition active:scale-[0.98]"
        >
          <Download size={16} strokeWidth={2.5} />
          Download Order Sheet
        </button>
      )}

      {pendingBudgetReview.length > 0 && (
        <div className="mt-2">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-white/40">
            Pending Budget Review
          </h3>
          <div className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-2xl border border-amber-300/15 bg-amber-300/5 backdrop-blur-md">
            {pendingBudgetReview.map((deficit) => (
              <SlowMoverRow key={deficit.sku} deficit={deficit} onOverride={onOverride} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
