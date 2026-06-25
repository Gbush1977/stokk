import { RefreshCw } from "lucide-react";
import { MOCK_INVENTORY } from "./mockInventory";
import InventoryHealthWidgets from "./InventoryHealthWidgets";
import InventoryTable from "./InventoryTable";
import ReorderSheet from "./ReorderSheet";

export default function Dashboard() {
  const items = MOCK_INVENTORY;

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 px-4 pb-8 pt-[max(env(safe-area-inset-top),20px)]">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Analytics Dashboard</h1>
          <p className="text-[11px] text-white/40">Synced from latest shelf scans</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60">
          <RefreshCw size={12} />
          2 min ago
        </span>
      </header>

      <section className="mb-6">
        <InventoryHealthWidgets items={items} />
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-white/80">Shelf Scan Sync</h2>
        <InventoryTable items={items} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-white/80">Reorder Sheet</h2>
        <ReorderSheet items={items} />
      </section>
    </div>
  );
}
