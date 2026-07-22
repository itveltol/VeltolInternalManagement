import type { ComponentType } from "react";
import { ArrowUpRight } from "lucide-react";
import type { KpiCard } from "../mock-data";

interface Props {
  cards: KpiCard[];
  icons?: Partial<Record<string, ComponentType<{ className?: string }>>>;
}

export function DashboardKpiRow({ cards, icons }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = icons?.[card.label];
        return card.featured ? (
          <div
            key={card.label}
            className="grad-navy relative overflow-hidden rounded-card p-5 text-white shadow-navy"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(91,141,239,0.35),transparent_70%)]" />
            <div className="relative flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase tracking-[.09em] text-[#B7C4E3]">
                {card.label}
              </span>
              {Icon && (
                <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-white/10">
                  <Icon className="size-4 text-white" />
                </div>
              )}
            </div>
            <div className="relative mt-3 flex items-baseline gap-1.5">
              <span className="font-display text-[32px] leading-none tracking-tight whitespace-nowrap tabular-nums">
                {card.value}
              </span>
              <span className="text-[12px] font-medium text-[#B7C9F5]">{card.unit}</span>
            </div>
            {card.delta && (
              <div className="relative mt-3 inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2 py-1 text-[12px] font-medium text-[#E4EAF6]">
                {card.deltaPositive && <ArrowUpRight className="size-3 text-[var(--v-success)]" />}
                {card.delta}
              </div>
            )}
          </div>
        ) : (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-card border border-border bg-card p-5 shadow-card"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute">
                {card.label}
              </span>
              {Icon && (
                <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-veltol-tint">
                  <Icon className="size-4 text-veltol-primary" />
                </div>
              )}
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-display text-[32px] leading-none tracking-tight text-veltol-fg whitespace-nowrap tabular-nums">
                {card.value}
              </span>
              <span className="text-[12px] font-medium text-veltol-fgDim">{card.unit}</span>
            </div>
            {card.delta && (
              <div className="mt-1.5 text-[13px] font-medium text-veltol-fgDim">{card.delta}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
