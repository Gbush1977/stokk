import type { InventoryItem } from "./types";
import { getStatus, isCritical } from "./inventoryMetrics";

interface InventoryTableProps {
  items: InventoryItem[];
}

export default function InventoryTable({ items }: InventoryTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md">
            <tr className="text-[11px] uppercase tracking-wide text-white/40">
              <th className="px-3 py-2 font-medium">Brand &amp; Line</th>
              <th className="px-3 py-2 font-medium">Shade</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">In Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((item) => {
              const status = getStatus(item);
              const critical = isCritical(item);
              return (
                <tr key={item.id}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium leading-tight text-white/90">{item.brand}</p>
                    <p className="text-[11px] text-white/45">{item.line}</p>
                  </td>
                  <td className="px-3 py-2.5 text-white/70">{item.shade}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        status === "full" ? "bg-mint/15 text-mint" : "bg-amber-300/15 text-amber-200"
                      }`}
                    >
                      {status === "full" ? "Full" : "Partial"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <p className={`font-semibold leading-tight ${critical ? "text-rose-300" : "text-white"}`}>
                      {item.quantity} in stock
                    </p>
                    <p className="text-[11px] text-white/40">Target: {item.parLevel}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
