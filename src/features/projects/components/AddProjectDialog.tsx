"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/shared/components/ui/button";
import { AiFillButton } from "@/shared/components/ui/ai-fill-button";
import { useAiFormFill } from "@/shared/hooks/useAiFormFill";
import { createProject } from "@/app/[locale]/(app)/projects/actions";
import type { ProjectManager } from "../types";
import type { ClientRef } from "@/features/clients/types";
import { AddClientDialog } from "@/features/clients/components/AddClientDialog";
import type { SubcontractorRef } from "@/features/subcontractors/types";
import { AddSubcontractorDialog } from "@/features/subcontractors/components/AddSubcontractorDialog";
import { FolderScanStep } from "./FolderScanStep";
import { ProjectFormFields } from "./ProjectFormFields";
import { useProjectFormState, EMPTY_FIELDS, type ProjectFieldsState } from "./projectFormState";
import { cn } from "@/shared/utils/cn";

const AI_TARGET_FIELDS: (keyof ProjectFieldsState)[] = [
  "name",
  "county",
  "site_location",
  "project_type",
  "contract_number",
  "mw_solar",
  "mw_bess",
  "notes",
];

interface Props {
  open: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  subcontractorRefs: SubcontractorRef[];
  exchangeRate: number | null;
  onClose: () => void;
}

export function AddProjectDialog({ open, managers, clientRefs, subcontractorRefs, exchangeRate, onClose }: Props) {
  const t = useTranslations("projects");

  const [state, action, pending] = useActionState(createProject, null);
  const [step, setStep] = useState<"form" | "scan">("form");
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);
  const [folderLinked, setFolderLinked] = useState(false);

  const {
    fields,
    setFields,
    setField,
    handleCategoryChange,
    handleExecutionModeChange,
    handleFinancialTypeChange,
    setStatusManual,
    setSiteLocation,
    setLocationSelect,
    handleMapChange,
  } = useProjectFormState();

  const [snapshot, setSnapshot] = useState<ProjectFieldsState | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRef | null>(null);
  const [localClientRefs, setLocalClientRefs] = useState<ClientRef[]>(clientRefs);
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<SubcontractorRef | null>(null);
  const [localSubcontractorRefs, setLocalSubcontractorRefs] = useState<SubcontractorRef[]>(subcontractorRefs);
  const [showAddSubcontractor, setShowAddSubcontractor] = useState(false);

  useEffect(() => {
    setLocalClientRefs(clientRefs);
  }, [clientRefs]);

  useEffect(() => {
    setLocalSubcontractorRefs(subcontractorRefs);
  }, [subcontractorRefs]);

  const getContext = useCallback(() => ({ name: fields.name }), [fields.name]);

  const { fillWithAi, loading, hasSuggestions, reset } = useAiFormFill({
    formType: "project",
    getContext,
    targetFields: AI_TARGET_FIELDS,
  });

  useEffect(() => {
    if (state?.success && state.projectId) {
      setCreatedProjectId(state.projectId);
      setFolderLinked(state.folderCreated !== false);
      setStep("scan");
    }
  }, [state?.success, state?.projectId]);

  useEffect(() => {
    if (!open) {
      setFields(EMPTY_FIELDS);
      setSnapshot(null);
      setStep("form");
      setCreatedProjectId(null);
      setSelectedClient(null);
      setSelectedSubcontractor(null);
      reset();
    }
  }, [open]);

  const handleFill = async () => {
    setSnapshot({ ...fields });
    const suggestions = await fillWithAi();
    if (Object.keys(suggestions).length > 0) {
      setFields((f) => ({ ...f, ...(suggestions as Partial<ProjectFieldsState>) }));
    }
  };

  const handleFileSelect = async (file: File) => {
    setSnapshot({ ...fields });
    const suggestions = await fillWithAi(file);
    if (Object.keys(suggestions).length > 0) {
      setFields((f) => ({ ...f, ...(suggestions as Partial<ProjectFieldsState>) }));
    }
  };

  const handleUndo = () => {
    if (snapshot) {
      setFields(snapshot);
      setSnapshot(null);
      reset();
    }
  };

  const aiClass = (key: keyof ProjectFieldsState) =>
    cn(hasSuggestions && fields[key] ? "ring-1 ring-veltol-accent/30" : "");

  return (
    <>
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          {step === "scan" && createdProjectId !== null ? (
            <>
              <Dialog.Title className="text-xl font-semibold text-veltol-fg">
                {t("folderScan.stepTitle")}
              </Dialog.Title>
              <div className="mt-6">
                <FolderScanStep
                  projectId={createdProjectId}
                  folderLinked={folderLinked}
                  onClose={onClose}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-xl font-semibold text-veltol-fg">
                  {t("addProject")}
                </Dialog.Title>
                <AiFillButton
                  onFill={handleFill}
                  onFileSelect={handleFileSelect}
                  onUndo={handleUndo}
                  loading={loading}
                  hasSuggestions={hasSuggestions}
                />
              </div>

              <form action={action} className="mt-6 space-y-4">
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
                  clientRefs={localClientRefs}
                  selectedClient={selectedClient}
                  onClientChange={setSelectedClient}
                  onNewClient={() => setShowAddClient(true)}
                  subcontractorRefs={localSubcontractorRefs}
                  selectedSubcontractor={selectedSubcontractor}
                  onSubcontractorChange={setSelectedSubcontractor}
                  onNewSubcontractor={() => setShowAddSubcontractor(true)}
                  exchangeRate={exchangeRate}
                  aiClass={aiClass}
                  fieldErrors={state?.fieldErrors}
                />

                {state?.error && <p className="text-sm text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>}
                {state?.success && state.folderCreated === false && (
                  <p className="text-sm text-veltol-orange">{t("folderFailed")}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
                  <Button type="submit" disabled={pending}>{pending ? t("saving") : t("save")}</Button>
                </div>
              </form>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>

    <AddClientDialog
      open={showAddClient}
      onClose={() => setShowAddClient(false)}
      onCreated={(client) => {
        setLocalClientRefs((refs) =>
          [...refs, client].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setSelectedClient(client);
      }}
    />

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
