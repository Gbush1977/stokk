import { Download, AlertCircle } from "lucide-react";
import type { InventoryItem } from "./types";
import { getReorderList } from "./inventoryMetrics";

interface ReorderSheetProps {
  items: InventoryItem[];
}

function exportOrderSheet(items: InventoryItem[]) {
  const reorderList = getReorderList(items);
  const header = "Brand,Line,Shade,Current Qty,Par Level,Reorder Qty";
  const rows = reorderList.map(
    ({ item, reorderQty }) =>
      `${item.brand},${item.line},${item.shade},${item.quantity},${item.parLevel},${reorderQty}`,
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `stokk-order-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReorderSheet({ items }: ReorderSheetProps) {
  const reorderList = getReorderList(items);

  if (reorderList.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/50 backdrop-blur-md">
        All shelves are fully stocked. Nothing to reorder.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
        {reorderList.map(({ item, reorderQty, critical }) => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium text-white">
                {critical && <AlertCircle size={13} className="shrink-0 text-rose-300" />}
                <span className="truncate">
                  {item.brand} {item.line}
                </span>
              </p>
              <p className="truncate text-[11px] text-white/45">
                {item.shade} · {item.quantity}/{item.parLevel} in stock
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-electric/15 px-2.5 py-1 text-[12px] font-semibold text-electric">
              Reorder: {reorderQty}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => exportOrderSheet(items)}
        className="flex items-center justify-center gap-2 rounded-xl bg-electric py-3 text-sm font-semibold text-white shadow-lg shadow-electric/30 transition active:scale-[0.98]"
      >
        <Download size={16} strokeWidth={2.5} />
        Export Order Sheet
      </button>
    </div>
  );
}
