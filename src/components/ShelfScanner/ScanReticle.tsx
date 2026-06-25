interface ScanReticleProps {
  isScanning: boolean;
  overlapLocked?: boolean;
}

const CORNER_BASE = "absolute h-7 w-7 transition-colors duration-300";

export default function ScanReticle({ isScanning, overlapLocked = false }: ScanReticleProps) {
  const cornerColor = overlapLocked ? "border-electric drop-shadow-[0_0_6px_rgba(17,59,255,0.85)]" : "border-white/40";

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[42%] z-10 h-[58%] w-[88%] -translate-x-1/2 -translate-y-1/2"
      aria-hidden="true"
    >
      {/* rule-of-thirds grid */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-[0.12]">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="border border-white" />
        ))}
      </div>

      {/* corner brackets */}
      <span className={`${CORNER_BASE} ${cornerColor} left-0 top-0 rounded-tl-xl border-l-[3px] border-t-[3px]`} />
      <span className={`${CORNER_BASE} ${cornerColor} right-0 top-0 rounded-tr-xl border-r-[3px] border-t-[3px]`} />
      <span className={`${CORNER_BASE} ${cornerColor} bottom-0 left-0 rounded-bl-xl border-b-[3px] border-l-[3px]`} />
      <span className={`${CORNER_BASE} ${cornerColor} bottom-0 right-0 rounded-br-xl border-b-[3px] border-r-[3px]`} />

      {/* sweeping scan line */}
      <div className="absolute inset-x-2 top-0 h-full overflow-hidden">
        <div
          className={`h-1/3 w-full bg-gradient-to-b from-transparent via-electric/70 to-transparent blur-[2px] ${
            isScanning ? "animate-scan-line" : "opacity-0"
          }`}
        />
      </div>
    </div>
  );
}
