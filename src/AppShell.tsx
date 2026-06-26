import { useCallback, useEffect, useState } from "react";
import { ShelfScannerViewfinder } from "./components/ShelfScanner";
import type { ScanMode } from "./components/ShelfScanner";
import { Dashboard } from "./components/Dashboard";
import type { DashboardReport } from "./components/Dashboard";
import { MOCK_REPORT } from "./components/Dashboard/mockInventory";
import BottomTabBar from "./components/BottomTabBar";
import type { AppView } from "./components/BottomTabBar";
import { fetchInventoryReport } from "./lib/inventory/report";
import { setBudgetOverride } from "./lib/inventory/budgetOverride";

export default function AppShell() {
  const [view, setView] = useState<AppView>("scanner");
  const [report, setReport] = useState<DashboardReport>(MOCK_REPORT);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);

  // Live data comes straight from Supabase. If that's unreachable (offline,
  // no project configured locally) we keep the mock dataset already in
  // state instead of leaving the dashboard blank.
  const refetchReport = useCallback(async () => {
    try {
      const data = await fetchInventoryReport();
      setReport({
        ...data,
        items: data.items.map((item) => ({
          sku: item.sku,
          brand: item.brand,
          line: item.line,
          shade: item.shadeCode,
          fullUnits: item.fullUnits,
          partialFraction: item.partialFraction,
          parLevel: item.idealStockLevel,
        })),
      });
    } catch {
      // stay on whatever report (live or mock) is already in state
    }
  }, []);

  useEffect(() => {
    refetchReport();
  }, [refetchReport]);

  const handleScanComplete = useCallback(
    (_mode: ScanMode) => {
      setLastScanAt(Date.now());
      refetchReport();
    },
    [refetchReport],
  );

  const handleOverride = useCallback(
    async (sku: string, approved: boolean) => {
      try {
        await setBudgetOverride(sku, approved);
      } finally {
        refetchReport();
      }
    },
    [refetchReport],
  );

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-zinc-950 font-sans text-white">
      <div className="relative flex-1 overflow-hidden">
        {view === "scanner" ? (
          <ShelfScannerViewfinder onScanComplete={handleScanComplete} onInventoryAdjusted={refetchReport} />
        ) : (
          <Dashboard report={report} lastScanAt={lastScanAt} onOverride={handleOverride} />
        )}
      </div>
      <BottomTabBar view={view} onChange={setView} />
    </div>
  );
}
