import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  value: string;
  subtitle?: string;
  children?: ReactNode;
}

export default function MetricCard({
  icon: Icon,
  iconClassName,
  label,
  value,
  subtitle,
  children,
}: MetricCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          iconClassName ?? "bg-electric/15 text-electric"
        }`}
      >
        <Icon size={20} strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">{label}</p>
        <p className="mt-0.5 text-2xl font-bold leading-tight text-white">{value}</p>
        {subtitle && <p className="mt-0.5 text-[11px] text-white/40">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
