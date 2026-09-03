"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/shared/components/ui/button";
import { updateProject, getExchangeRate } from "@/app/[locale]/(app)/projects/actions";
import type { Project, ProjectManager } from "../types";
import type { ClientRef } from "@/features/clients/types";
import type { SubcontractorRef, ProjectSubcontractorAssignment } from "@/features/subcontractors/types";
import { AddSubcontractorDialog } from "@/features/subcontractors/components/AddSubcontractorDialog";
import { ProjectFormFields } from "./ProjectFormFields";
import { useProjectFormState } from "./projectFormState";

interface Props {
  project: Project;
  open: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  subcontractorRefs: SubcontractorRef[];
  currentAssignment: ProjectSubcontractorAssignment | null;
  onClose: () => void;
}

export function EditProjectDialog(props: Props) {
  // Snapshot the project on first mount so a server-side revalidation that
  // lands while the dialog is still open (e.g. right after submit) can't
  // change already-uncontrolled fields' defaultValue mid-flight.
  const [project] = useState(props.project);
  const [currentAssignment] = useState(props.currentAssignment);
  const { open, managers, clientRefs, subcontractorRefs, onClose } = props;
  const t = useTranslations("projects");

  const [state, action, pending] = useActionState(updateProject, null);
  // React 19 resets a form's fields (including controlled <select>s — a
  // confirmed React bug, facebook/react#30580) after every submission
  // attempt, success or failure. Remounting the field subtree on each
  // attempt forces React to re-apply current state instead of leaving the
  // native post-submit reset visible.
  const [submitCount, setSubmitCount] = useState(0);
  useEffect(() => {
    if (state) setSubmitCount((n) => n + 1);
  }, [state]);

  const {
    fields,
    setField,
    handleCategoryChange,
    handleCountyChange,
    mapFocus,
    handleExecutionModeChange,
    handleFinancialTypeChange,
    setStatusManual,
    setSiteLocation,
    setLocationSelect,
    handleMapChange,
  } = useProjectFormState(project);

  const [localSubcontractorRefs, setLocalSubcontractorRefs] = useState<SubcontractorRef[]>(subcontractorRefs);
  const [showAddSubcontractor, setShowAddSubcontractor] = useState(false);

  const [selectedClient, setSelectedClient] = useState<ClientRef | null>(
    clientRefs.find((c) => c.id === project.client_id) ?? null,
  );
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<SubcontractorRef | null>(
    subcontractorRefs.find((s) => s.id === currentAssignment?.subcontractor_id) ?? null,
  );

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
              key={submitCount}
              fields={fields}
              onFieldChange={setField}
              onCategoryChange={handleCategoryChange}
              onCountyChange={handleCountyChange}
              mapFocus={mapFocus}
              onExecutionModeChange={handleExecutionModeChange}
              onFinancialTypeChange={handleFinancialTypeChange}
              statusManual={fields.status_manual}
              onStatusManualChange={setStatusManual}
              onSiteLocationChange={setSiteLocation}
              onLocationSelect={setLocationSelect}
              onMapChange={handleMapChange}
              managers={managers}
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
              defaultAssignmentStartDate={currentAssignment?.start_date ?? undefined}
              defaultAssignmentDeadline={currentAssignment?.deadline ?? undefined}
              progressReadout={project.progress_pct}
              fieldErrors={state?.fieldErrors}
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
