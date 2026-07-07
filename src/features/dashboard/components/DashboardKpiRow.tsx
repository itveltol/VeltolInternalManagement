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
            className="relative overflow-hidden rounded-xl p-5 text-white shadow-v-glow-lg"
            style={{
              background:
                "linear-gradient(135deg, #0B1E3E 0%, #163D64 25%, #1A5F88 45%, #1E8FA2 70%, #2BC4C8 100%)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 75% 20%, rgba(255,255,255,0.22), transparent 60%)",
              }}
            />
            <div className="relative">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/85">
                {card.label}
              </span>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-[30px] font-medium leading-none tracking-tight">
                  {card.value}
                </span>
                <span className="font-mono text-[11px] text-white/75">{card.unit}</span>
              </div>
              {/* <span className="mt-3 block font-mono text-[10px] tracking-wider text-white/80">
                {card.delta}
              </span> */}
            </div>
          </div>
        ) : (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl border border-veltol-aqua/10 bg-veltol-deep/60 p-5 backdrop-blur-xl"
          >
            <div className="absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-transparent via-veltol-aqua/40 to-transparent" />
            <div className="relative">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-veltol-fgMute">
                {card.label}
              </span>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-[30px] font-medium leading-none tracking-tight text-veltol-fg">
                  {card.value}
                </span>
                <span className="font-mono text-[11px] text-veltol-fgDim">{card.unit}</span>
              </div>
              {/* <span
                className={`mt-3 block font-mono text-[10px] tracking-wider ${
                  card.deltaPositive ? "text-veltol-green" : "text-veltol-amber"
                }`}
              >
                {card.delta}
              </span> */}
            </div>
          </div>
        )
      )}
    </div>
  );
}
