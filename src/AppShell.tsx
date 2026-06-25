import { useCallback, useEffect, useState } from "react";
import { ShelfScannerViewfinder } from "./components/ShelfScanner";
import type { ScanMode } from "./components/ShelfScanner";
import { Dashboard } from "./components/Dashboard";
import type { DashboardReport } from "./components/Dashboard";
import { MOCK_REPORT } from "./components/Dashboard/mockInventory";
import BottomTabBar from "./components/BottomTabBar";
import type { AppView } from "./components/BottomTabBar";

export default function AppShell() {
  const [view, setView] = useState<AppView>("scanner");
  const [report, setReport] = useState<DashboardReport>(MOCK_REPORT);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);

  // Live data comes from the Postgres-backed /api/inventory/report. If that's
  // unreachable (offline, no DB configured locally) we keep the mock dataset
  // already in state instead of leaving the dashboard blank.
  const refetchReport = useCallback(async () => {
    try {
      const response = await fetch("/api/inventory/report");
      if (!response.ok) return;
      const data: DashboardReport = await response.json();
      setReport(data);
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
        await fetch("/api/inventory/budget-override", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sku, approved }),
        });
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
