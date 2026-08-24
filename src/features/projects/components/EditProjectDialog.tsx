"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { FormField } from "@/shared/components/ui/form-field";
import { Select } from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { updateProject, assignProjectTeam, getExchangeRate } from "@/app/[locale]/(app)/projects/actions";
import type { Project, ProjectManager } from "../types";
import type { ClientRef } from "@/features/clients/types";
import type { SubcontractorRef, ProjectSubcontractorAssignment } from "@/features/subcontractors/types";
import { AddSubcontractorDialog } from "@/features/subcontractors/components/AddSubcontractorDialog";
import { ProjectFormFields } from "./ProjectFormFields";
import { useProjectFormState } from "./projectFormState";
import type { Team } from "@/features/teams/types";

interface Props {
  project: Project;
  open: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  subcontractorRefs: SubcontractorRef[];
  currentAssignment: ProjectSubcontractorAssignment | null;
  teams: Team[];
  canAssignTeam: boolean;
  onClose: () => void;
}

export function EditProjectDialog(props: Props) {
  // Snapshot the project on first mount so a server-side revalidation that
  // lands while the dialog is still open (e.g. right after submit) can't
  // change already-uncontrolled fields' defaultValue mid-flight.
  const [project] = useState(props.project);
  const [currentAssignment] = useState(props.currentAssignment);
  const { open, managers, clientRefs, subcontractorRefs, teams, canAssignTeam, onClose } = props;
  const t = useTranslations("projects");

  const [state, action, pending] = useActionState(updateProject, null);

  const {
    fields,
    setField,
    handleCategoryChange,
    handleExecutionModeChange,
    handleFinancialTypeChange,
    setStatusManual,
    setSiteLocation,
    setLocationSelect,
    handleMapChange,
  } = useProjectFormState(project);

  const [localSubcontractorRefs, setLocalSubcontractorRefs] = useState<SubcontractorRef[]>(subcontractorRefs);
  const [showAddSubcontractor, setShowAddSubcontractor] = useState(false);

  const [teamId, setTeamId] = useState<number | null>(project.team_id);
  const [teamState, setTeamState] = useState<{ error?: string; success?: string } | null>(null);
  const [teamPending, startTeamTransition] = useTransition();

  const [selectedClient, setSelectedClient] = useState<ClientRef | null>(
    clientRefs.find((c) => c.id === project.client_id) ?? null,
  );
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<SubcontractorRef | null>(
    subcontractorRefs.find((s) => s.id === currentAssignment?.subcontractor_id) ?? null,
  );

  function handleTeamChange(value: string) {
    const nextTeamId = value === "" ? null : Number(value);
    setTeamId(nextTeamId);
    startTeamTransition(async () => {
      const result = await assignProjectTeam(project.id, nextTeamId);
      setTeamState(result);
    });
  }

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  return (
    <>
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("editProject")}
          </Dialog.Title>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="projectId" value={project.id} />

            <ProjectFormFields
              fields={fields}
              onFieldChange={setField}
              onCategoryChange={handleCategoryChange}
              onExecutionModeChange={handleExecutionModeChange}
              onFinancialTypeChange={handleFinancialTypeChange}
              statusManual={fields.status_manual}
              onStatusManualChange={setStatusManual}
              onSiteLocationChange={setSiteLocation}
              onLocationSelect={setLocationSelect}
              onMapChange={handleMapChange}
              managers={managers}
              defaultManagerId={project.manager_id ?? ""}
              contractTypeDefaults={project.contract_type}
              clientRefs={clientRefs}
              selectedClient={selectedClient}
              onClientChange={setSelectedClient}
              subcontractorRefs={localSubcontractorRefs}
              selectedSubcontractor={selectedSubcontractor}
              onSubcontractorChange={setSelectedSubcontractor}
              onNewSubcontractor={() => setShowAddSubcontractor(true)}
              assignmentPriceDefaults={{
                amount: currentAssignment?.currency === "RON" ? currentAssignment?.price_lei ?? null : currentAssignment?.price_eur ?? null,
                currency: currentAssignment?.currency ?? "EUR",
                rate: currentAssignment?.conversion_rate ?? null,
                onRefreshRate: getExchangeRate,
                refreshLabel: t("fields.refreshRate"),
              }}
              exchangeRate={project.conversion_rate}
              valueDefaults={{
                amount: project.currency === "RON" ? project.value_lei : project.value_eur,
                currency: project.currency,
                rate: project.conversion_rate,
                onRefreshRate: getExchangeRate,
                refreshLabel: t("fields.refreshRate"),
              }}
              defaultPhase={project.current_phase}
              defaultStatus={project.status}
              defaultContractDate={project.contract_date ?? undefined}
              defaultDeadline={project.deadline ?? undefined}
              defaultAssignmentStartDate={currentAssignment?.start_date ?? undefined}
              defaultAssignmentDeadline={currentAssignment?.deadline ?? undefined}
              progressReadout={project.progress_pct}
              fieldErrors={state?.fieldErrors}
              team={
                fields.execution_mode === "internal" && canAssignTeam ? (
                  <FormField label={t("fields.team")}>
                    <Select
                      value={teamId ?? ""}
                      onChange={(e) => handleTeamChange(e.target.value)}
                      disabled={teamPending}
                    >
                      <option value="" className="bg-card">—</option>
                      {teams.map((tm) => (
                        <option key={tm.id} value={tm.id} className="bg-card">{tm.name}</option>
                      ))}
                    </Select>
                    {teamState?.error && <p className="text-xs text-veltol-red">{t(teamState.error as Parameters<typeof t>[0])}</p>}
                    {teamState?.success && <p className="text-xs text-veltol-green">{t(teamState.success as Parameters<typeof t>[0])}</p>}
                  </FormField>
                ) : null
              }
            />

            {state?.error && (
              <p className="text-sm text-veltol-red">
                {state.error === "errorDetail"
                  ? t("errorDetail", { message: state.errorMessage ?? "" })
                  : t(state.error as Parameters<typeof t>[0])}
              </p>
            )}
            {state?.success && <p className="text-sm text-veltol-green">{t(state.success as Parameters<typeof t>[0])}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
              <Button type="submit" disabled={pending}>{pending ? t("saving") : t("save")}</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>

    <AddSubcontractorDialog
      open={showAddSubcontractor}
      onClose={() => setShowAddSubcontractor(false)}
      onCreated={(subcontractor) => {
        setLocalSubcontractorRefs((refs) =>
          [...refs, subcontractor].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setSelectedSubcontractor(subcontractor);
      }}
    />
    </>
  );
}
