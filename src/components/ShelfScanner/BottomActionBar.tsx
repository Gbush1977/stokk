import { Images, Camera, Grid3x3 } from "lucide-react";
import type { ScanMode } from "./types";
import ModeToggle from "./ModeToggle";

interface BottomActionBarProps {
  mode: ScanMode;
  onModeChange: (mode: ScanMode) => void;
  detectedCount: number;
  isScanning: boolean;
  gridOn: boolean;
  onToggleGrid: () => void;
  onCapture: () => void;
}

export default function BottomActionBar({
  mode,
  onModeChange,
  detectedCount,
  isScanning,
  gridOn,
  onToggleGrid,
  onCapture,
}: BottomActionBarProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-10">
      <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-mint" />
        {detectedCount} product{detectedCount === 1 ? "" : "s"} detected
      </div>

      <ModeToggle mode={mode} onChange={onModeChange} />

      <div className="flex w-full items-center justify-between px-4">
        <button
          type="button"
          aria-label="Import from gallery"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition active:scale-90 active:bg-white/20"
        >
          <Images size={20} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={onCapture}
          aria-label="Scan shelf"
          className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full transition active:scale-95"
        >
          <span
            className={`absolute inset-0 rounded-full border-[3px] border-electric ${
              isScanning ? "animate-ping opacity-60" : "opacity-100"
            }`}
          />
          <span className="absolute inset-[6px] rounded-full bg-white" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-electric text-white shadow-lg shadow-electric/50">
              <Camera size={26} strokeWidth={2.25} />
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleGrid}
          aria-label="Toggle grid overlay"
          aria-pressed={gridOn}
          className={`flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-md transition active:scale-90 ${
            gridOn
              ? "border-electric bg-electric text-white"
              : "border-white/10 bg-white/10 text-white active:bg-white/20"
          }`}
        >
          <Grid3x3 size={20} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
