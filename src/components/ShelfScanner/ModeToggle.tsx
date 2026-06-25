import { LayoutGrid, Palette } from "lucide-react";
import type { ScanMode } from "./types";

interface ModeToggleProps {
  mode: ScanMode;
  onChange: (mode: ScanMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="relative mx-auto flex w-fit items-center rounded-full border border-white/10 bg-white/10 p-1 backdrop-blur-md">
      <span
        className={`absolute inset-y-1 w-[140px] rounded-full bg-electric shadow-lg shadow-electric/40 transition-transform duration-300 ease-out ${
          mode === "color-tab" ? "translate-x-[140px]" : "translate-x-0"
        }`}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={() => onChange("shelf")}
        aria-pressed={mode === "shelf"}
        className={`relative z-10 flex w-[140px] items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-semibold whitespace-nowrap transition-colors ${
          mode === "shelf" ? "text-white" : "text-white/60"
        }`}
      >
        <LayoutGrid size={14} strokeWidth={2.5} />
        Shelf Mode
      </button>
      <button
        type="button"
        onClick={() => onChange("color-tab")}
        aria-pressed={mode === "color-tab"}
        className={`relative z-10 flex w-[140px] items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-semibold whitespace-nowrap transition-colors ${
          mode === "color-tab" ? "text-white" : "text-white/60"
        }`}
      >
        <Palette size={14} strokeWidth={2.5} />
        Color Tab Mode
      </button>
    </div>
  );
}
