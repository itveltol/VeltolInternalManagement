"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { FormField } from "@/shared/components/ui/form-field";
import { FormSection } from "@/shared/components/ui/form-section";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { upsertBessData } from "@/app/[locale]/(app)/projects/[id]/actions";
import type { ProjectBessData } from "../types";

interface Props {
  projectId: number;
  data: ProjectBessData | null;
  open: boolean;
  onClose: () => void;
}

export function EditBessDataDialog({ projectId, data, open, onClose }: Props) {
  const t = useTranslations("projects");
  const tBess = useTranslations("projects.bessData");
  const [state, action, pending] = useActionState(upsertBessData, null);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  const incarcareDefault =
    data?.incarcare_din_retea === true ? "true" : data?.incarcare_din_retea === false ? "false" : "";

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {tBess("dialogTitle")}
          </Dialog.Title>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="project_id" value={projectId} />

            <FormSection title={tBess("title")} first>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label={tBess("putereInstalata")}>
                  <Input name="putere_instalata" type="number" step="0.001" min="0" defaultValue={data?.putere_instalata ?? ""} />
                </FormField>
                <FormField label={tBess("putereDescarcare")}>
                  <Input name="putere_descarcare" type="number" step="0.001" min="0" defaultValue={data?.putere_descarcare ?? ""} />
                </FormField>
              </div>
              <FormField label={tBess("incarcareDinRetea")}>
                <Select name="incarcare_din_retea" defaultValue={incarcareDefault}>
                  <option value="" className="bg-card">—</option>
                  <option value="false" className="bg-card">{tBess("withoutGridCharging")}</option>
                  <option value="true" className="bg-card">{tBess("withGridCharging")}</option>
                </Select>
              </FormField>
              <FormField label={tBess("tipBess")}>
                <Input name="tip_bess" defaultValue={data?.tip_bess ?? ""} />
              </FormField>
              <FormField label={tBess("tipPcs")}>
                <Input name="tip_pcs" defaultValue={data?.tip_pcs ?? ""} />
              </FormField>
              <FormField label={tBess("ridicareTopo")}>
                <Input name="ridicare_topo" defaultValue={data?.ridicare_topo ?? ""} />
              </FormField>
              <FormField label={tBess("detaliiTrafo")}>
                <Input name="detalii_trafo" defaultValue={data?.detalii_trafo ?? ""} />
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
