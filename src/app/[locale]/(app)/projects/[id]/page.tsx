import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/core/supabase/server";
import { getProject, getChecklistRecords } from "./actions";
import { mergeChecklistRows, computeSectionSummaries } from "@/features/projects/checklists/services/checklistTemplate";
import { ChecklistShell } from "@/features/projects/checklists/components/ChecklistShell";
import { Badge } from "@/shared/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { phaseVariant, projectStatusVariant } from "@/shared/utils/status-variant";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ProjectChecklistPage({ params }: Props) {
  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const canMutate = ["admin", "project_manager"].includes(profile?.role ?? "");

  const [project, records] = await Promise.all([
    getProject(projectId),
    getChecklistRecords(projectId),
  ]);

  if (!project) notFound();

  const rows = mergeChecklistRows(records);
  const sections = computeSectionSummaries(rows);

  const t = await getTranslations("checklist");
  const tPhase = await getTranslations("projectPhase");
  const tStatus = await getTranslations("projectStatus");

  const leafPcts = rows
    .filter((r) => !r.isSection && r.pct !== null)
    .map((r) => r.pct as number);
  const overallPct =
    leafPcts.length > 0
      ? Math.round(leafPcts.reduce((a, b) => a + b, 0) / leafPcts.length)
      : 0;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 font-mono text-[11px] text-veltol-fgMute">
        <Link href="/projects" className="transition-colors hover:text-veltol-fgDim">
          {t("breadcrumbProjects")}
        </Link>
        <span>/</span>
        <span className="text-veltol-fgDim">{project.name}</span>
        <span>/</span>
        <span className="text-veltol-aqua">{t("breadcrumbChecklist")}</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mono-label text-[10px] text-veltol-fgMute">
            {t("eyebrow", { id: project.id })}
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-veltol-fg">
            {project.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={phaseVariant(project.current_phase)}>
              {tPhase(project.current_phase)}
            </Badge>
            <Badge variant={projectStatusVariant(project.status)}>
              {tStatus(project.status)}
            </Badge>
            {project.county && (
              <span className="font-mono text-[11px] text-veltol-fgMute">
                {project.county}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="font-mono text-[42px] font-bold leading-none tabular-nums text-veltol-aqua">
            {overallPct}
            <span className="text-[22px] text-veltol-fgMute">%</span>
          </div>
          <div className="mono-label mt-1 text-[9px] text-veltol-fgMute">
            {t("overallCompletion")}
          </div>
        </div>
      </div>

      {/* Section summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {sections.map((s) => (
          <div key={s.phase} className="v-panel rounded-lg px-3 py-2.5">
            <div className="mono-label text-[8px] text-veltol-fgMute">
              {t(`phase.${s.phase}`)}
            </div>
            <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-veltol-teal to-veltol-aqua transition-all duration-700"
                style={{ width: `${s.avgPct}%` }}
              />
            </div>
            <div className="mt-1 font-mono tabular-nums text-[11px] text-veltol-fgDim">
              {Math.round(s.avgPct)}%
            </div>
          </div>
        ))}
      </div>

      <ChecklistShell rows={rows} projectId={project.id} canMutate={canMutate} />
    </div>
  );
}
