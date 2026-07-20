import { CONTRACT_TYPES } from "@/features/projects/types";
import type { DashboardProject } from "@/app/[locale]/(app)/dashboard/action";

interface Labels {
  eyebrow: string;
  title: string;
  projectCount: (count: number) => string;
  contractType: (type: string) => string;
}

interface Props {
  projects: DashboardProject[];
  labels: Labels;
}

export function ContractTypeBreakdown({ projects, labels }: Props) {
  const counts = CONTRACT_TYPES.map((type) => ({
    type,
    count: projects.filter((p) => p.contract_type.includes(type)).length,
  }));
  const maxCount = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      <div className="p-5">
        <span className="text-xs font-medium text-veltol-fgMute">{labels.eyebrow}</span>
        <h2 className="mt-0.5 text-base font-semibold text-veltol-fg">{labels.title}</h2>
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-3 p-5">
        {counts.map(({ type, count }) => (
          <div key={type} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-[13px] text-veltol-fg">{labels.contractType(type)}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-veltol-surface">
              <div
                className="h-full rounded-full bg-veltol-accent transition-all"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right font-mono text-[11px] tabular-nums text-veltol-fgMute">
              {labels.projectCount(count)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
