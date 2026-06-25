import { Camera, LayoutDashboard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppView = "scanner" | "dashboard";

interface BottomTabBarProps {
  view: AppView;
  onChange: (view: AppView) => void;
}

const TABS: { id: AppView; label: string; icon: LucideIcon }[] = [
  { id: "scanner", label: "Live Scanner", icon: Camera },
  { id: "dashboard", label: "Analytics Dashboard", icon: LayoutDashboard },
];

export default function BottomTabBar({ view, onChange }: BottomTabBarProps) {
  return (
    <nav className="flex items-stretch border-t border-white/10 bg-black/90 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 backdrop-blur-md">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = view === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={active}
            className="flex flex-1 flex-col items-center gap-1 px-2 py-1.5 transition active:scale-95"
          >
            <Icon size={22} strokeWidth={2.25} className={active ? "text-electric" : "text-white/45"} />
            <span className={`text-[11px] font-medium ${active ? "text-electric" : "text-white/45"}`}>
              {tab.label}
            </span>
            <span className={`mt-0.5 h-1 w-1 rounded-full ${active ? "bg-electric" : "bg-transparent"}`} />
          </button>
        );
      })}
    </nav>
  );
}
