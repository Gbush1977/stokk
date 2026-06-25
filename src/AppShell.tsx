import { useState } from "react";
import { ShelfScannerViewfinder } from "./components/ShelfScanner";
import { Dashboard } from "./components/Dashboard";
import BottomTabBar from "./components/BottomTabBar";
import type { AppView } from "./components/BottomTabBar";

export default function AppShell() {
  const [view, setView] = useState<AppView>("scanner");

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-zinc-950 font-sans text-white">
      <div className="relative flex-1 overflow-hidden">
        {view === "scanner" ? <ShelfScannerViewfinder /> : <Dashboard />}
      </div>
      <BottomTabBar view={view} onChange={setView} />
    </div>
  );
}
