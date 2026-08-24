"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { FormField } from "@/shared/components/ui/form-field";
import { Select } from "@/shared/components/ui/select";
import { createMinimalProjectAction } from "@/app/[locale]/(app)/projects/actions";
import { createSituationAction } from "@/app/[locale]/(app)/situations/actions";
import { ClientCombobox } from "@/features/clients/components/ClientCombobox";
import { AddClientDialog } from "@/features/clients/components/AddClientDialog";
import type { ClientRef } from "@/features/clients/types";
import type { ProjectManager } from "@/features/projects/types";

interface Props {
  open: boolean;
  onClose: () => void;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  nextContractNumber: string;
}

/**
 * Two-step flow launched from the centralizer's "add situation + new
 * project" button: a minimal project (name/client/manager) is created first,
 * then a situation is created for it — the rest of the project (county,
 * coordinates, MW, contract dates...) is left to be filled in later via the
 * normal Edit project flow.
 */
export function CreateSituationWithProjectDialog({
  open,
  onClose,
  managers,
  clientRefs,
  nextContractNumber,
}: Props) {
  const tSituations = useTranslations("situations");
  const tCentralizer = useTranslations("situations.centralizer");
  const tProjects = useTranslations("projects");

  const [step, setStep] = useState<"project" | "situation">("project");
  const [createdProject, setCreatedProject] = useState<{ id: number; name: string } | null>(null);
  const [situationName, setSituationName] = useState("");

  const [selectedClient, setSelectedClient] = useState<ClientRef | null>(null);
  const [localClientRefs, setLocalClientRefs] = useState<ClientRef[]>(clientRefs);
  const [showAddClient, setShowAddClient] = useState(false);

  // Local snapshot of the project name field — the success effect below needs
  // it to build `createdProject`, but can't read the form's live DOM value.
  const [projectNameDraft, setProjectNameDraft] = useState("");

  const [projectState, projectAction, projectPending] = useActionState(createMinimalProjectAction, null);
  const [situationState, situationAction, situationPending] = useActionState(createSituationAction, null);

  useEffect(() => {
    setLocalClientRefs(clientRefs);
  }, [clientRefs]);

  useEffect(() => {
    if (projectState?.success && projectState.projectId) {
      setCreatedProject({ id: projectState.projectId, name: projectNameDraft });
      setStep("situation");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectState?.success, projectState?.projectId]);

  useEffect(() => {
    if (situationState?.success) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [situationState?.success]);

  useEffect(() => {
    if (!open) {
      setStep("project");
      setCreatedProject(null);
      setSelectedClient(null);
      setSituationName("");
      setProjectNameDraft("");
    }
  }, [open]);

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
            {step === "project" ? (
              <>
                <Dialog.Title className="text-xl font-semibold text-veltol-fg">
                  {tCentralizer("newContractTitle")}
                </Dialog.Title>

                <form action={projectAction} className="mt-6 space-y-4">
                  <FormField label={tProjects("fields.name")} required>
                    <Input
                      name="name"
                      required
                      value={projectNameDraft}
                      onChange={(e) => setProjectNameDraft(e.target.value)}
                      aria-invalid={!!projectState?.fieldErrors?.name}
                    />
                  </FormField>

                  <FormField
                    required
                    label={
                      <div className="flex w-full items-center justify-between">
                        <span>{tProjects("fields.client")}</span>
                        <button
                          type="button"
                          onClick={() => setShowAddClient(true)}
                          className="text-[11px] font-medium text-veltol-accent hover:underline"
                        >
                          {tProjects("newClient")}
                        </button>
                      </div>
                    }
                  >
                    <ClientCombobox
                      name="client_id"
                      clients={localClientRefs}
                      value={selectedClient}
                      onValueChange={setSelectedClient}
                      aria-invalid={!!projectState?.fieldErrors?.client_id}
                    />
                  </FormField>

                  <FormField label={tProjects("fields.manager")}>
                    <Select name="manager_id" defaultValue="">
                      <option value="" className="bg-card">—</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id} className="bg-card">
                          {[m.first_name, m.last_name].filter(Boolean).join(" ") || m.id}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField label={tProjects("fields.contractNumber")}>
                    <Input name="contract_number" defaultValue={nextContractNumber} />
                  </FormField>

                  {projectState?.error && (
                    <p className="text-sm text-veltol-red">
                      {tSituations(projectState.error as Parameters<typeof tSituations>[0])}
                    </p>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Dialog.Close render={<Button type="button" variant="outline">{tSituations("cancel")}</Button>} />
                    <Button type="submit" disabled={projectPending || !selectedClient}>
                      {projectPending ? tSituations("saving") : tCentralizer("continueToSituation")}
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <Dialog.Title className="text-xl font-semibold text-veltol-fg">
                  {tSituations("addSituation")}
                </Dialog.Title>

                <form action={situationAction} className="mt-6 space-y-4">
                  <input type="hidden" name="project_id" value={createdProject?.id ?? ""} />

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-veltol-fgMute">{tSituations("fields.project")} *</Label>
                    <p className="text-sm text-veltol-fg">{createdProject?.name}</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-veltol-fgMute">{tSituations("fields.name")} *</Label>
                    <Input name="name" required value={situationName} onChange={(e) => setSituationName(e.target.value)} />
                  </div>

                  {situationState?.error && (
                    <p className="text-sm text-veltol-red">
                      {tSituations(situationState.error as Parameters<typeof tSituations>[0])}
                    </p>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Dialog.Close render={<Button type="button" variant="outline">{tSituations("cancel")}</Button>} />
                    <Button type="submit" disabled={situationPending}>
                      {situationPending ? tSituations("saving") : tSituations("save")}
                    </Button>
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
          setLocalClientRefs((refs) => [...refs, client].sort((a, b) => a.name.localeCompare(b.name)));
          setSelectedClient(client);
        }}
      />
    </>
  );
}
