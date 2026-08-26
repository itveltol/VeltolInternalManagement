"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { FormField } from "@/shared/components/ui/form-field";
import { FormSection } from "@/shared/components/ui/form-section";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { upsertCefData } from "@/app/[locale]/(app)/projects/[id]/actions";
import type { ProjectCefData } from "../types";

interface Props {
  projectId: number;
  data: ProjectCefData | null;
  open: boolean;
  onClose: () => void;
}

export function EditCefDataDialog({ projectId, data, open, onClose }: Props) {
  const t = useTranslations("projects");
  const tCef = useTranslations("projects.cefData");
  const [state, action, pending] = useActionState(upsertCefData, null);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {tCef("dialogTitle")}
          </Dialog.Title>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="project_id" value={projectId} />

            <FormSection title={tCef("title")} first>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label={tCef("putereInstalata")}>
                  <Input name="putere_instalata" type="number" step="0.001" min="0" defaultValue={data?.putere_instalata ?? ""} />
                </FormField>
                <FormField label={tCef("putereDebitata")}>
                  <Input name="putere_debitata" type="number" step="0.001" min="0" defaultValue={data?.putere_debitata ?? ""} />
                </FormField>
              </div>
              <FormField label={tCef("tipPanou")}>
                <Input name="tip_panou" defaultValue={data?.tip_panou ?? ""} />
              </FormField>
              <FormField label={tCef("tipInvertor")}>
                <Input name="tip_invertor" defaultValue={data?.tip_invertor ?? ""} />
              </FormField>
              <FormField label={tCef("tipStructura")}>
                <Input name="tip_structura" defaultValue={data?.tip_structura ?? ""} />
              </FormField>
              <FormField label={tCef("tipGard")}>
                <Input name="tip_gard" defaultValue={data?.tip_gard ?? ""} />
              </FormField>
              <FormField label={tCef("ridicareTopo")}>
                <Input name="ridicare_topo" defaultValue={data?.ridicare_topo ?? ""} />
              </FormField>
            </FormSection>

            {state?.error && (
              <p className="text-sm text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
              <Button type="submit" disabled={pending}>{pending ? t("saving") : t("save")}</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
