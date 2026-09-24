"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Loader2, Sparkles, Undo2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { updateProject, getExchangeRate } from "@/app/[locale]/(app)/projects/actions";
import { fillProjectFromContract, getProjectContractDocument } from "@/app/[locale]/(app)/projects/[id]/actions";
import type { ContractType, Project, ProjectManager } from "../types";
import type { ClientRef } from "@/features/clients/types";
import type { SubcontractorRef, ProjectSubcontractorAssignment } from "@/features/subcontractors/types";
import type { Contract } from "@/features/projects/contracts/types";
import { AddSubcontractorDialog } from "@/features/subcontractors/components/AddSubcontractorDialog";
import { ProjectFormFields } from "./ProjectFormFields";
import { useProjectFormState, type ProjectFieldsState } from "./projectFormState";
import { cn } from "@/shared/utils/cn";

interface Props {
  project: Project;
  /** Every contract on this project — used to grey out a contract_type
   * checkbox already claimed by a contract other than the "primary" one
   * this form edits (mirrors AddEditContractDialog's client-side guard for
   * the DB's contract_claimed_types_exclusive_idx constraint). */
  contracts: Contract[];
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
  const { open, contracts, managers, clientRefs, subcontractorRefs, onClose } = props;
  const t = useTranslations("projects");

  // Matches updateProject()'s server-side notion of the "primary" contract
  // this form edits (existingContracts[0]) so the claimed-elsewhere check
  // excludes the right contract.
  const primaryContractId = contracts[0]?.id;
  const projectValueAmount = project.currency === "RON" ? project.value_lei : project.value_eur;
  const contractTypesClaimedElsewhere = new Set(
    contracts.filter((c) => c.id !== primaryContractId).flatMap((c) => c.contract_type),
  );

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
    setFields,
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

  // AI fill from the contract uploaded under the Documents tab's "Contract"
  // label. undefined = still looking it up, null = none uploaded.
  const [contractDoc, setContractDoc] = useState<{ id: number; name: string } | null | undefined>(undefined);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ProjectFieldsState | null>(null);
  // The value input and contract-type checkboxes are uncontrolled, so AI
  // suggestions for them are fed in as their defaults and applied by
  // remounting them (aiInputKey).
  const [aiValue, setAiValue] = useState<{ amount: number | null; currency: "EUR" | "RON" } | null>(null);
  const [aiContractTypes, setAiContractTypes] = useState<ContractType[] | null>(null);
  const [aiInputKey, setAiInputKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getProjectContractDocument(project.id)
      .then((doc) => !cancelled && setContractDoc(doc))
      .catch(() => !cancelled && setContractDoc(null));
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const handleContractFill = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await fillProjectFromContract(project.id);
      if (!result.suggestions) {
        setAiError(result.error);
      } else if (Object.keys(result.suggestions).length > 0) {
        const { value_amount, currency, contract_type, ...rest } = result.suggestions;
        setSnapshot({ ...fields });
        setFields((f) => ({ ...f, ...(rest as Partial<ProjectFieldsState>) }));
        if (value_amount || currency) {
          setAiValue({
            amount: value_amount ? Number(value_amount) : projectValueAmount,
            currency: (currency as "EUR" | "RON" | undefined) ?? project.currency,
          });
        }
        if (contract_type) {
          setAiContractTypes(contract_type.split(",") as ContractType[]);
        }
        if (value_amount || currency || contract_type) setAiInputKey((k) => k + 1);
      } else {
        setAiError("contractFill.nothingFound");
      }
    } catch {
      setAiError("contractFill.failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleUndo = () => {
    if (snapshot) setFields(snapshot);
    setSnapshot(null);
    if (aiValue || aiContractTypes) {
      setAiValue(null);
      setAiContractTypes(null);
      setAiInputKey((k) => k + 1);
    }
  };

  const aiClass = (key: keyof ProjectFieldsState) =>
    cn(snapshot && fields[key] !== snapshot[key] ? "ring-1 ring-veltol-accent/30" : "");

  return (
    <>
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-xl font-semibold text-veltol-fg">
              {t("editProject")}
            </Dialog.Title>
            {snapshot ? (
              <button
                type="button"
                onClick={handleUndo}
                className="inline-flex items-center gap-1 font-mono text-[10px] text-veltol-fgMute hover:text-veltol-accent transition-colors"
              >
                <Undo2 className="size-3" />
                {t("contractFill.undo")}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleContractFill}
                disabled={!contractDoc || aiLoading}
                title={contractDoc ? contractDoc.name : contractDoc === null ? t("contractFill.noContractHint") : undefined}
                className={cn(
                  "inline-flex items-center gap-1 font-mono text-[10px] transition-colors",
                  "text-veltol-accent/70 hover:text-veltol-accent",
                  (!contractDoc || aiLoading) && "opacity-40 pointer-events-none",
                )}
              >
                {aiLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                {aiLoading ? t("contractFill.loading") : t("contractFill.button")}
              </button>
            )}
          </div>
          {contractDoc === null && (
            <p className="mt-1 text-right font-mono text-[10px] text-veltol-fgMute">
              {t("contractFill.noContractHint")}
            </p>
          )}
          {aiError && (
            <p className="mt-2 text-sm text-veltol-red">{t(aiError as Parameters<typeof t>[0])}</p>
          )}

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
              contractTypeDefaults={aiContractTypes ?? project.contract_type}
              contractTypesClaimedElsewhere={contractTypesClaimedElsewhere}
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
                amount: aiValue ? aiValue.amount : projectValueAmount,
                currency: aiValue ? aiValue.currency : project.currency,
                rate: project.conversion_rate,
                onRefreshRate: getExchangeRate,
                refreshLabel: t("fields.refreshRate"),
              }}
              aiInputKey={aiInputKey}
              valueClassName={aiValue ? "ring-1 ring-veltol-accent/30" : undefined}
              contractTypeClassName={aiContractTypes ? "ring-1 ring-veltol-accent/30 p-1.5" : undefined}
              defaultPhase={project.current_phase}
              defaultStatus={project.status}
              defaultAssignmentStartDate={currentAssignment?.start_date ?? undefined}
              defaultAssignmentDeadline={currentAssignment?.deadline ?? undefined}
              // Residential contracts have no Matrice coverage, so
              // progress_pct never moves off 0 — omit the misleading
              // permanent 0% readout.
              progressReadout={project.project_category === "residential" ? undefined : project.progress_pct}
              aiClass={aiClass}
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
