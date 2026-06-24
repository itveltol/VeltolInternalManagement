import { Badge } from "@/shared/components/ui/badge";
import { statusVariant } from "@/shared/utils/status-variant";
import type { MockProject } from "../mock-data";

interface Props {
  projects: MockProject[];
  liveLabel: string;
  eyebrow: string;
  title: string;
  tPhase: (phase: string) => string;
}

export function DashboardRecentProjects({ projects, liveLabel, eyebrow, title, tPhase }: Props) {
  return (
    <div className="v-panel v-hairline relative overflow-hidden rounded-xl">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="mono-label text-[10px] text-veltol-fgMute">{eyebrow}</span>
            <h2 className="mt-0.5 font-display text-base font-semibold text-veltol-fg">{title}</h2>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-veltol-green/20 bg-veltol-green/[0.08] px-2.5 py-1">
            <div className="v-live-dot" />
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-veltol-green">
              {liveLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-veltol-aqua/20 to-transparent" />

      <div className="divide-y divide-white/[0.04]">
        {projects.map((project) => (
          <div key={project.id} className="flex items-center gap-4 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-veltol-fgMute">{project.id}</span>
                <span className="truncate text-[13px] font-medium text-veltol-fg">{project.name}</span>
              </div>
              <div className="mt-0.5 text-xs text-veltol-fgDim">{project.location}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-mono tabular-nums text-[13px] text-veltol-fg">
                {project.capacityMWp.toFixed(1)}{" "}
                <span className="text-veltol-fgMute">MWp</span>
              </div>
              <div className="mt-0.5 font-mono tabular-nums text-[11px] text-veltol-fgDim">
                {project.valueEur.toLocaleString("hu-HU")}{" "}
                <span className="text-veltol-fgMute">EUR</span>
              </div>
            </div>
            <div className="shrink-0">
              <Badge variant={statusVariant(project.status)}>{tPhase(project.status)}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
