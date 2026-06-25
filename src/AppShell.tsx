import { useCallback, useState } from "react";
import { ShelfScannerViewfinder } from "./components/ShelfScanner";
import type { ScanMode } from "./components/ShelfScanner";
import { Dashboard } from "./components/Dashboard";
import type { InventoryItem } from "./components/Dashboard";
import { MOCK_INVENTORY } from "./components/Dashboard/mockInventory";
import BottomTabBar from "./components/BottomTabBar";
import type { AppView } from "./components/BottomTabBar";

function pickRandomIndices(length: number, count: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, Math.min(count, length));
}

export default function AppShell() {
  const [view, setView] = useState<AppView>("scanner");
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);

  const handleScanComplete = useCallback((mode: ScanMode) => {
    setInventory((prev) => {
      const next = [...prev];
      const targets = pickRandomIndices(next.length, 2);
      targets.forEach((i) => {
        const item = next[i];
        if (mode === "shelf") {
          // a shelf scan confirms stock was found and replenished to par
          next[i] = { ...item, quantity: item.parLevel + Math.round(Math.random()) };
        } else {
          // a color-tab scan reflects tubes consumed during a client service
          const consumed = 1 + Math.floor(Math.random() * 2);
          next[i] = { ...item, quantity: Math.max(item.quantity - consumed, 0) };
        }
      });
      return next;
    });
    setLastScanAt(Date.now());
  }, []);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-zinc-950 font-sans text-white">
      <div className="relative flex-1 overflow-hidden">
        {view === "scanner" ? (
          <ShelfScannerViewfinder onScanComplete={handleScanComplete} />
        ) : (
          <Dashboard items={inventory} lastScanAt={lastScanAt} />
        )}
      </div>
      <BottomTabBar view={view} onChange={setView} />
    </div>
  );
}
