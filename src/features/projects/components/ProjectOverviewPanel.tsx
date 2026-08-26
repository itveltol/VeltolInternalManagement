"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { EditProjectDialog } from "./EditProjectDialog";
import { phaseVariant, projectStatusVariant } from "@/shared/utils/status-variant";
import { formatDate } from "@/shared/utils/formatDate";
import { formatConvertedCurrency } from "@/shared/utils/currency";
import { cn } from "@/shared/utils/cn";
import type { Project, ProjectManager } from "../types";
import type { ClientRef } from "@/features/clients/types";
import type { SubcontractorRef, ProjectSubcontractorAssignment } from "@/features/subcontractors/types";
import type { Team } from "@/features/teams/types";

function DetailSection({ title, first, children }: { title: string; first?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(!first && "mt-4 border-t border-border pt-4")}>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-veltol-fgMute">
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldGrid({ items, wide }: { items: Array<{ label: string; value: React.ReactNode }>; wide?: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2",
        wide ? "lg:grid-cols-4" : "lg:grid-cols-3",
      )}
    >
      {items.map(({ label, value }) => (
        <div key={label}>
          <div className="text-[12px] font-medium text-veltol-fgMute">{label}</div>
          <div className="mt-0.5 text-[15px] text-veltol-fg">{value}</div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  project: Project;
  canMutate: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  subcontractorRefs: SubcontractorRef[];
  currentAssignment: ProjectSubcontractorAssignment | null;
  teams: Team[];
  canAssignTeam: boolean;
}

export function ProjectOverviewPanel({ project, canMutate, managers, clientRefs, subcontractorRefs, currentAssignment, teams, canAssignTeam }: Props) {
  const t = useTranslations("projects");
  const tPhase = useTranslations("projectPhase");
  const tStatus = useTranslations("projectStatus");
  const tType = useTranslations("projectType");
  const tCategory = useTranslations("projectCategory");
  const tContractType = useTranslations("contractType");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSession, setEditSession] = useState(0);

  function formatValue(v: number | null, currency: string) {
    if (v == null) return "—";
    return `${new Intl.NumberFormat("hu-HU").format(v)} ${currency}`;
  }

  function formatSourceValueWithConversion(v: number | null, currency: "EUR" | "RON", conversionRate: number | null) {
    if (v == null) return "—";
    const converted = formatConvertedCurrency(v, currency, conversionRate);
    return (
      <>
        {formatValue(v, currency === "EUR" ? "€" : "Lei")}
        <span className="ml-1.5 text-veltol-fgMute">{converted}</span>
      </>
    );
  }

  function formatMw(v: number | null) {
    return v != null ? `${v} MW` : "—";
  }

  const managerName = project.manager
    ? [project.manager.first_name, project.manager.last_name].filter(Boolean).join(" ") || "—"
    : "—";

  const isSubcontracted = project.execution_mode === "subcontracted";

  const identityFields: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("fields.projectCategory"), value: tCategory(project.project_category) },
    ...(project.project_type ? [{ label: t("fields.projectType"), value: tType(project.project_type as Parameters<typeof tType>[0]) }] : []),
  ];

  const locationFields: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("fields.county"), value: project.county ?? "—" },
    { label: t("fields.siteLocation"), value: project.site_location ?? "—" },
  ];

  const capacityFields: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("fields.mwSolar"), value: formatMw(project.mw_solar) },
    { label: t("fields.mwBess"), value: formatMw(project.mw_bess) },
  ];

  const peopleFields: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("fields.manager"), value: managerName },
    ...(isSubcontracted ? [] : [{ label: t("fields.team"), value: project.team?.name ?? "—" }]),
    { label: t("fields.client"), value: project.client?.name ?? "—" },
  ];

  const contractFields: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: t("fields.contractType"),
      value: project.contract_type.length > 0
        ? project.contract_type.map((c) => tContractType(c)).join(", ")
        : "—",
    },
    { label: t("fields.contractNumber"), value: project.contract_number ?? "—" },
    { label: t("fields.contractDate"), value: formatDate(project.contract_date) || "—" },
    {
      label: t("fields.value"),
      value: formatSourceValueWithConversion(
        project.currency === "EUR" ? project.value_eur : project.value_lei,
        project.currency,
        project.conversion_rate,
      ),
    },
  ];

  const executionFields: Array<{ label: string; value: React.ReactNode }> = isSubcontracted
    ? [
        { label: t("fields.subcontractorName"), value: project.subcontractor?.name ?? "—" },
        { label: t("fields.subcontractorContactPerson"), value: project.subcontractor?.contact_person ?? "—" },
        { label: t("fields.subcontractorPhone"), value: project.subcontractor?.phone ?? "—" },
        {
          label: t("fields.subcontractorPrice"),
          value: formatSourceValueWithConversion(
            project.subcontractor
              ? (project.subcontractor.currency === "EUR" ? project.subcontractor.price_eur : project.subcontractor.price_lei)
              : null,
            project.subcontractor?.currency ?? "EUR",
            project.subcontractor?.conversion_rate ?? null,
          ),
        },
        { label: t("fields.subcontractorStartDate"), value: formatDate(project.subcontractor?.start_date ?? null) || "—" },
        { label: t("fields.subcontractorDeadline"), value: formatDate(project.subcontractor?.deadline ?? null) || "—" },
      ]
    : [
        { label: t("fields.progress"), value: `${project.progress_pct}%` },
        { label: t("fields.deadline"), value: formatDate(project.deadline) || "—" },
      ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={phaseVariant(project.current_phase)}>{tPhase(project.current_phase)}</Badge>
          <Badge variant={projectStatusVariant(project.status)}>{tStatus(project.status)}</Badge>
          {isSubcontracted && <Badge variant="secondary">{t("subcontracted")}</Badge>}
        </div>
        {canMutate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditSession((n) => n + 1);
              setIsEditOpen(true);
            }}
          >
            <Pencil />
            {t("editProject")}
          </Button>
        )}
      </div>

      <DetailSection title={t("sections.identity")} first>
        <FieldGrid items={identityFields} />
      </DetailSection>

      <DetailSection title={t("sections.location")}>
        <FieldGrid items={locationFields} />
      </DetailSection>

      <DetailSection title={t("sections.capacity")}>
        <FieldGrid items={capacityFields} />
      </DetailSection>

      <DetailSection title={t("sections.peopleTeam")}>
        <FieldGrid items={peopleFields} />
      </DetailSection>

      <DetailSection title={t("sections.contractFinancials")}>
        <FieldGrid items={contractFields} wide />
      </DetailSection>

      <DetailSection title={t("sections.executionStatus")}>
        <FieldGrid items={executionFields} />
      </DetailSection>

      {project.notes && (
        <DetailSection title={t("sections.notes")}>
          <div className="whitespace-pre-wrap text-[15px] text-veltol-fg">{project.notes}</div>
        </DetailSection>
      )}

      {canMutate && (
        <EditProjectDialog
          key={`${project.id}-${editSession}`}
          project={project}
          open={isEditOpen}
          managers={managers}
          clientRefs={clientRefs}
          subcontractorRefs={subcontractorRefs}
          currentAssignment={currentAssignment}
          teams={teams}
          canAssignTeam={canAssignTeam}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </div>
  );
}
