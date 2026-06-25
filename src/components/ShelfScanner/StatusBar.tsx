import { ChevronLeft, Wifi, Zap, ZapOff, Settings2 } from "lucide-react";

interface StatusBarProps {
  isConnected: boolean;
  isScanning: boolean;
  flashOn: boolean;
  onToggleFlash: () => void;
  onClose: () => void;
}

export default function StatusBar({
  isConnected,
  isScanning,
  flashOn,
  onToggleFlash,
  onClose,
}: StatusBarProps) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 bg-gradient-to-b from-black/85 via-black/40 to-transparent px-4 pb-6 pt-[max(env(safe-area-inset-top),16px)]">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close scanner"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition active:scale-90 active:bg-white/20"
      >
        <ChevronLeft size={20} strokeWidth={2.5} />
      </button>

      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isConnected ? "bg-mint animate-ping" : "bg-rose-500"
            }`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              isConnected ? "bg-mint" : "bg-rose-500"
            }`}
          />
        </span>
        <span className="text-[11px] font-medium tracking-wide text-white/90">
          {isConnected ? (isScanning ? "Analysing shelf…" : "AI ready") : "Reconnecting…"}
        </span>
        <Wifi size={13} className="text-white/50" strokeWidth={2} />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleFlash}
          aria-label="Toggle flash"
          aria-pressed={flashOn}
          className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition active:scale-90 ${
            flashOn
              ? "border-electric bg-electric text-white"
              : "border-white/10 bg-white/10 text-white active:bg-white/20"
          }`}
        >
          {flashOn ? <Zap size={18} strokeWidth={2.5} /> : <ZapOff size={18} strokeWidth={2.5} />}
        </button>
        <button
          type="button"
          aria-label="Scanner settings"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition active:scale-90 active:bg-white/20"
        >
          <Settings2 size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
