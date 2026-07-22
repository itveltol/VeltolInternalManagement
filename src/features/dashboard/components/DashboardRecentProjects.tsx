import { Badge } from "@/shared/components/ui/badge";
import { statusVariant } from "@/shared/utils/status-variant";
import { DashboardProject } from "@/app/[locale]/(app)/dashboard/action";
import { Link } from "@/i18n/navigation";

interface Props {
  projects: DashboardProject[];
  liveLabel: string;
  eyebrow: string;
  title: string;
  tPhase: (phase: string) => string;
}

export function DashboardRecentProjects({ projects, liveLabel, eyebrow, title, tPhase }: Props) {
  return (
    <div className="relative overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute">{eyebrow}</span>
            <h2 className="mt-0.5 text-[20px] font-bold text-veltol-fg">{title}</h2>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--v-success)]/20 bg-[var(--v-success-bg)] px-2.5 py-1">
            <div className="v-live-dot" />
            <span className="text-[11px] font-bold uppercase tracking-[.09em] text-[var(--v-success)]">
              {liveLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="divide-y divide-border">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="flex items-center gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-[#F6F9FE]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums whitespace-nowrap text-veltol-fgMute">{project.id}</span>
                <span className="truncate text-[14px] font-semibold text-veltol-fg">{project.name}</span>
              </div>
              <div className="mt-0.5 text-[13px] text-veltol-fgDim">{project.site_location}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[14px] font-medium tabular-nums whitespace-nowrap text-veltol-fg">
                {project.mw_solar?.toFixed(1) ?? "0.0"}{" "}
                <span className="text-veltol-fgMute">MWp</span>
              </div>
              <div className="mt-0.5 text-[12px] tabular-nums whitespace-nowrap text-veltol-fgDim">
                {project.value_eur?.toLocaleString("hu-HU") ?? "0"}{" "}
                <span className="text-veltol-fgMute">EUR</span>
              </div>
            </div>
            <div className="shrink-0">
              <Badge variant={statusVariant(project.current_phase)}>{tPhase(project.current_phase)}</Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
