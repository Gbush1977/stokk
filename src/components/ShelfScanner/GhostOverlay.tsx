import { ArrowRight } from "lucide-react";

interface GhostOverlayProps {
  imageUrl: string;
}

export default function GhostOverlay({ imageUrl }: GhostOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[6] overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-y-0 left-0 w-[42%] bg-cover bg-[right_center] opacity-30 grayscale contrast-75"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="absolute inset-y-0 left-0 w-[42%] bg-gradient-to-r from-transparent via-transparent to-zinc-950/85" />

      <div className="absolute left-[42%] top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-electric/70 bg-zinc-950/80 text-electric backdrop-blur-md animate-pulse-slow">
          <ArrowRight size={18} strokeWidth={2.5} />
        </div>
        <div className="whitespace-nowrap rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium tracking-wide text-white/70 backdrop-blur-md">
          Line up the edge
        </div>
      </div>
    </div>
  );
}
