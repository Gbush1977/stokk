import { CheckCircle2 } from "lucide-react";

interface ToastProps {
  message: string;
  visible: boolean;
}

export default function Toast({ message, visible }: ToastProps) {
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),16px)] z-50 flex justify-center transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
      }`}
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full border border-mint/30 bg-zinc-900/95 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-black/40 backdrop-blur-md">
        <CheckCircle2 size={16} className="shrink-0 text-mint" strokeWidth={2.5} />
        {message}
      </div>
    </div>
  );
}
