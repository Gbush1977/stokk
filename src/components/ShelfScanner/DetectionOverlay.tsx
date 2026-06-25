import { CheckCircle2, AlertTriangle, AlertOctagon, LoaderCircle } from "lucide-react";
import type { Detection } from "./types";
import { STATUS_LABEL } from "./mockDetections";

const STATUS_STYLES: Record<
  Detection["status"],
  { border: string; text: string; chipBg: string; icon: React.ReactNode }
> = {
  full: {
    border: "border-mint",
    text: "text-mint",
    chipBg: "bg-mint/15",
    icon: <CheckCircle2 size={12} strokeWidth={2.5} />,
  },
  partial: {
    border: "border-amber-300",
    text: "text-amber-200",
    chipBg: "bg-amber-300/15",
    icon: <AlertTriangle size={12} strokeWidth={2.5} />,
  },
  "low-stock": {
    border: "border-rose-400",
    text: "text-rose-200",
    chipBg: "bg-rose-400/15",
    icon: <AlertOctagon size={12} strokeWidth={2.5} />,
  },
  analyzing: {
    border: "border-electric",
    text: "text-electric",
    chipBg: "bg-electric/15",
    icon: <LoaderCircle size={12} strokeWidth={2.5} className="animate-spin" />,
  },
};

interface DetectionOverlayProps {
  detections: Detection[];
}

export default function DetectionOverlay({ detections }: DetectionOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true">
      {detections.map((detection) => {
        const style = STATUS_STYLES[detection.status];
        const isAnalyzing = detection.status === "analyzing";
        const anchorRight = parseFloat(detection.position.left) >= 40;

        return (
          <div
            key={detection.id}
            className={`absolute rounded-lg border-2 ${style.border} ${
              isAnalyzing ? "animate-pulse-slow" : ""
            }`}
            style={detection.position}
          >
            <div
              className={`absolute -top-px flex max-w-[58vw] -translate-y-full items-center gap-1 overflow-hidden whitespace-nowrap px-2 py-1 text-[10px] font-semibold tracking-tight backdrop-blur-md ${style.chipBg} ${style.text} ${
                anchorRight ? "right-0 rounded-t-md rounded-bl-md" : "left-0 rounded-t-md rounded-br-md"
              }`}
            >
              <span className="shrink-0">{style.icon}</span>
              {isAnalyzing ? (
                <span>Analyzing…</span>
              ) : (
                <span className="min-w-0 truncate">
                  {detection.brand} {detection.product}{" "}
                  <span className="opacity-80">[{STATUS_LABEL[detection.status]}]</span>
                </span>
              )}
              {!isAnalyzing && (
                <span className="shrink-0 font-normal opacity-70">{detection.confidence}%</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
