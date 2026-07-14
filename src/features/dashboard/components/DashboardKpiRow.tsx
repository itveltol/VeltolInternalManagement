import type { KpiCard } from "../mock-data";

interface Props {
  cards: KpiCard[];
}

export function DashboardKpiRow({ cards }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) =>
        card.featured ? (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl bg-veltol-primary p-5 text-white"
          >
            <span className="text-xs font-medium text-white/70">
              {card.label}
            </span>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-[30px] font-semibold leading-none tracking-tight">
                {card.value}
              </span>
              <span className="text-[11px] text-white/75">{card.unit}</span>
            </div>
          </div>
        ) : (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl border border-border bg-card p-5"
          >
            <span className="text-xs font-medium text-veltol-fgMute">
              {card.label}
            </span>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-[30px] font-semibold leading-none tracking-tight text-veltol-fg">
                {card.value}
              </span>
              <span className="text-[11px] text-veltol-fgDim">{card.unit}</span>
            </div>
          </div>
        )
      )}
    </div>
  );
}
