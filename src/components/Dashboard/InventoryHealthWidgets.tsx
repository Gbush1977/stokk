import { Package, Activity, AlertTriangle } from "lucide-react";
import type { InventoryItem } from "./types";
import MetricCard from "./MetricCard";

interface InventoryHealthWidgetsProps {
  items: InventoryItem[];
  stockroomFullnessPercent: number;
  criticalCount: number;
}

export default function InventoryHealthWidgets({
  items,
  stockroomFullnessPercent,
  criticalCount,
}: InventoryHealthWidgetsProps) {
  const brandCount = new Set(items.map((item) => item.brand)).size;
  const healthPct = stockroomFullnessPercent;

  return (
    <div className="flex flex-col gap-3">
      <MetricCard
        icon={Package}
        label="Total Products Tracked"
        value={String(items.length)}
        subtitle={`Across ${brandCount} brands`}
      />

      <MetricCard icon={Activity} label="Stock Level" value={`${healthPct}%`} subtitle="How full your stockroom is">
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-electric transition-all duration-500"
            style={{ width: `${healthPct}%` }}
          />
        </div>
      </MetricCard>

      <MetricCard
        icon={AlertTriangle}
        iconClassName="bg-rose-400/15 text-rose-300"
        label="Urgent Reorders"
        value={String(criticalCount)}
        subtitle="Need to order immediately"
      />
    </div>
  );
}
