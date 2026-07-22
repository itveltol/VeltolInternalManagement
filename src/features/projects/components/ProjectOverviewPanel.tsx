"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Pencil } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { EditProjectDialog } from "./EditProjectDialog";
import { phaseVariant, projectStatusVariant, priorityVariant } from "@/shared/utils/status-variant";
import type { Project, ProjectManager } from "../types";
import type { ClientRef } from "@/features/clients/types";
import type { Team } from "@/features/teams/types";

interface Props {
  project: Project;
  canMutate: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  teams: Team[];
  canAssignTeam: boolean;
}

export function ProjectOverviewPanel({ project, canMutate, managers, clientRefs, teams, canAssignTeam }: Props) {
  const t = useTranslations("projects");
  const tPhase = useTranslations("projectPhase");
  const tStatus = useTranslations("projectStatus");
  const tPriority = useTranslations("projectPriority");
  const tType = useTranslations("projectType");
  const tCategory = useTranslations("projectCategory");
  const tContractType = useTranslations("contractType");
  const locale = useLocale();
  const [isEditOpen, setIsEditOpen] = useState(false);

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(
      locale === "hu" ? "hu-HU" : locale === "ro" ? "ro-RO" : "en-GB",
      { year: "numeric", month: "2-digit", day: "2-digit" },
    );
  }

  function formatValue(v: number | null) {
    if (v == null) return "—";
    return `${new Intl.NumberFormat("hu-HU").format(v)} €`;
  }

  function formatMw(v: number | null) {
    return v != null ? `${v} MW` : "—";
  }

  const managerName = project.manager
    ? [project.manager.first_name, project.manager.last_name].filter(Boolean).join(" ") || "—"
    : "—";

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("fields.projectCategory"), value: tCategory(project.project_category) },
    ...(project.project_type ? [{ label: t("fields.projectType"), value: tType(project.project_type as Parameters<typeof tType>[0]) }] : []),
    { label: t("fields.county"), value: project.county ?? "—" },
    { label: t("fields.siteLocation"), value: project.site_location ?? "—" },
    { label: t("fields.mwSolar"), value: formatMw(project.mw_solar) },
    { label: t("fields.mwBess"), value: formatMw(project.mw_bess) },
    { label: t("fields.client"), value: project.client?.name ?? "—" },
    { label: t("fields.manager"), value: managerName },
    { label: t("fields.team"), value: project.team?.name ?? "—" },
    {
      label: t("fields.contractType"),
      value: project.contract_type.length > 0
        ? project.contract_type.map((c) => tContractType(c)).join(", ")
        : "—",
    },
    { label: t("fields.contractNumber"), value: project.contract_number ?? "—" },
    { label: t("fields.contractDate"), value: formatDate(project.contract_date) },
    { label: t("fields.deadline"), value: formatDate(project.deadline) },
    { label: t("fields.valueEur"), value: formatValue(project.value_eur) },
    { label: t("fields.progress"), value: `${project.progress_pct}%` },
    { label: t("fields.cuIssued"), value: project.cu_issued ? "✓" : "—" },
    { label: t("fields.atrIssued"), value: project.atr_issued ? "✓" : "—" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={phaseVariant(project.current_phase)}>{tPhase(project.current_phase)}</Badge>
          <Badge variant={projectStatusVariant(project.status)}>{tStatus(project.status)}</Badge>
          <Badge variant={priorityVariant(project.priority)}>{tPriority(project.priority)}</Badge>
        </div>
        {canMutate && (
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            <Pencil />
            {t("editProject")}
          </Button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <div className="text-[11px] font-medium text-veltol-fgMute">{label}</div>
            <div className="mt-0.5 text-sm text-veltol-fg">{value}</div>
          </div>
        ))}
      </div>

      {project.notes && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="text-[11px] font-medium text-veltol-fgMute">{t("fields.notes")}</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-veltol-fg">{project.notes}</div>
        </div>
      )}

      {canMutate && (
        <EditProjectDialog
          project={project}
          open={isEditOpen}
          managers={managers}
          clientRefs={clientRefs}
          teams={teams}
          canAssignTeam={canAssignTeam}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </div>
  );
}
