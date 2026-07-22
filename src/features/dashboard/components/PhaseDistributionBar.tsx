import type { ProjectPhase } from "@/features/projects/types";

interface PhaseCount {
  phase: ProjectPhase;
  label: string;
  count: number;
  color: string;
}

interface Props {
  eyebrow: string;
  title: string;
  phases: PhaseCount[];
}

export function PhaseDistributionBar({ eyebrow, title, phases }: Props) {
  const total = phases.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="relative overflow-hidden rounded-card border border-border bg-card p-5 shadow-card">
      <span className="text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute">
        {eyebrow}
      </span>
      <h2 className="mt-0.5 text-[20px] font-bold text-veltol-fg">{title}</h2>

      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-[var(--v-line-2)]">
        {phases.map((p) =>
          p.count > 0 ? (
            <div
              key={p.phase}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(p.count / total) * 100}%`, backgroundColor: p.color }}
            />
          ) : null
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {phases.map((p) => (
          <div key={p.phase} className="flex items-center gap-1.5 text-[14px] font-medium text-veltol-fgDim">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: p.color }}
              aria-hidden="true"
            />
            {p.label} <span className="font-display font-bold text-veltol-fg">{p.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
