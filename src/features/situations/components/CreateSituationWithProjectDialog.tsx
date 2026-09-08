"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { FormField } from "@/shared/components/ui/form-field";
import { Select } from "@/shared/components/ui/select";
import { CurrencyAmountInput } from "@/shared/components/ui/currency-amount-input";
import { createMinimalProjectAction } from "@/app/[locale]/(app)/projects/actions";
import { createSituationAction } from "@/app/[locale]/(app)/situations/actions";
import { ClientCombobox } from "@/features/clients/components/ClientCombobox";
import { AddClientDialog } from "@/features/clients/components/AddClientDialog";
import type { ClientRef } from "@/features/clients/types";
import type { ProjectManager, ProjectCategory } from "@/features/projects/types";
import { PROJECT_CATEGORIES } from "@/features/projects/types";

interface Props {
  open: boolean;
  onClose: () => void;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  nextContractNumber: string;
}

/**
 * Launched from the centralizer's "add situation + new project" button: a
 * minimal project (name/client/manager) is created. Industrial contracts
 * keep the original minimal flow — capacity/value are filled in later via
 * the full Edit project form on the project's detail page — and also get a
 * situation named after the project created for them automatically.
 * Residential contracts capture capacity/value here too, since they have no
 * "full form" to complete afterward (only a Documents tab), and stop after
 * the project row — they're lightweight records (no Matrice/Checklist/
 * Schedule), so an initial billing draw request isn't forced; one can still
 * be added manually later from the centralizer if needed.
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
  const tCategory = useTranslations("projectCategory");
  const router = useRouter();

  const [selectedClient, setSelectedClient] = useState<ClientRef | null>(null);
  const [localClientRefs, setLocalClientRefs] = useState<ClientRef[]>(clientRefs);
  const [showAddClient, setShowAddClient] = useState(false);
  const [projectCategory, setProjectCategory] = useState<ProjectCategory>("industrial");

  // Local snapshot of the project name field — the success effect below needs
  // it to submit the auto-named situation, but can't read the form's live
  // DOM value once it unmounts.
  const [projectNameDraft, setProjectNameDraft] = useState("");

  // Local snapshot of the suggested contract number — kept controlled so the
  // field doesn't complain when a later revalidation bumps the suggestion
  // while the dialog stays mounted.
  const [contractNumberDraft, setContractNumberDraft] = useState(nextContractNumber);

  // contract_date is submitted independently of the free-text contract number
  // (which embeds a Romanian-formatted date for display only) — it always
  // reflects today, the actual creation date, regardless of user edits above.
  const [contractDateIso, setContractDateIso] = useState(() => new Date().toISOString().slice(0, 10));

  const [projectState, projectAction, projectPending] = useActionState(createMinimalProjectAction, null);
  const [situationState, situationAction, situationPending] = useActionState(createSituationAction, null);
  // True from the moment the project is created until the follow-up
  // situation create either succeeds (dialog closes) or fails — keeps the
  // submit button disabled across both action calls, not just the first.
  const [isLinkingSituation, setIsLinkingSituation] = useState(false);

  useEffect(() => {
    setLocalClientRefs(clientRefs);
  }, [clientRefs]);

  useEffect(() => {
    if (!projectState?.success || !projectState.projectId) return;
    if (projectCategory === "residential") {
      // Residential contracts are lightweight records — no auto-created
      // situation, just navigate straight to the project so documents can
      // be attached.
      onClose();
      router.push(`/projects/${projectState.projectId}`);
      return;
    }
    setIsLinkingSituation(true);
    const formData = new FormData();
    formData.set("project_id", String(projectState.projectId));
    formData.set("name", projectNameDraft);
    startTransition(() => situationAction(formData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectState?.success, projectState?.projectId]);

  useEffect(() => {
    if (situationState?.error) setIsLinkingSituation(false);
  }, [situationState?.error]);

  useEffect(() => {
    if (situationState?.success && projectState?.projectId) {
      onClose();
      router.push(`/projects/${projectState.projectId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [situationState?.success]);

  useEffect(() => {
    if (!open) {
      setSelectedClient(null);
      setProjectNameDraft("");
      setContractNumberDraft(nextContractNumber);
      setContractDateIso(new Date().toISOString().slice(0, 10));
      setIsLinkingSituation(false);
      setProjectCategory("industrial");
    }
  }, [open, nextContractNumber]);

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
            <Dialog.Title className="text-xl font-semibold text-veltol-fg">
              {tCentralizer("newContractTitle")}
            </Dialog.Title>

            <form action={projectAction} className="mt-6 space-y-4">
              <FormField label={tProjects("fields.projectCategory")}>
                <Select
                  name="project_category"
                  value={projectCategory}
                  onChange={(e) => setProjectCategory(e.target.value as ProjectCategory)}
                >
                  {PROJECT_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-card">{tCategory(c)}</option>
                  ))}
                </Select>
              </FormField>

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

              <FormField label={tProjects("fields.manager")} required>
                <Select
                  name="manager_id"
                  defaultValue=""
                  required
                  aria-invalid={!!projectState?.fieldErrors?.manager_id}
                >
                  <option value="" className="bg-card">—</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id} className="bg-card">
                      {[m.first_name, m.last_name].filter(Boolean).join(" ") || m.id}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label={tProjects("fields.contractNumber")} required>
                <Input
                  name="contract_number"
                  required
                  value={contractNumberDraft}
                  onChange={(e) => setContractNumberDraft(e.target.value)}
                  aria-invalid={!!projectState?.fieldErrors?.contract_number}
                />
              </FormField>
              <input type="hidden" name="contract_date" value={contractDateIso} />

              {projectCategory === "residential" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label={tProjects("fields.mwSolar")} required>
                      <Input
                        name="mw_solar"
                        type="number"
                        step="0.001"
                        min="0"
                        required
                        aria-invalid={!!projectState?.fieldErrors?.mw_solar}
                      />
                    </FormField>
                    <FormField label={tProjects("fields.mwBess")} required>
                      <Input
                        name="mw_bess"
                        type="number"
                        step="0.001"
                        min="0"
                        required
                        aria-invalid={!!projectState?.fieldErrors?.mw_bess}
                      />
                    </FormField>
                  </div>

                  <FormField label={tProjects("fields.value")} required>
                    <CurrencyAmountInput
                      amountName="value_amount"
                      currencyName="currency"
                      rate={null}
                      required
                      aria-invalid={!!projectState?.fieldErrors?.value_amount}
                    />
                  </FormField>
                </>
              )}

              {(projectState?.error || situationState?.error) && (
                <p className="text-sm text-veltol-red">
                  {tSituations((projectState?.error ?? situationState?.error) as Parameters<typeof tSituations>[0])}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close render={<Button type="button" variant="outline">{tSituations("cancel")}</Button>} />
                <Button type="submit" disabled={projectPending || situationPending || isLinkingSituation || !selectedClient}>
                  {projectPending || situationPending || isLinkingSituation ? tSituations("saving") : tSituations("save")}
                </Button>
              </div>
            </form>
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
