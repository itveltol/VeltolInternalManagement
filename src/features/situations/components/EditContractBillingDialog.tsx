"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { CurrencyAmountInput } from "@/shared/components/ui/currency-amount-input";
import { ClientCombobox } from "@/features/clients/components/ClientCombobox";
import { updateContractAction, getBillingExchangeRate } from "@/app/[locale]/(app)/situations/actions";
import type { Project } from "@/features/projects/types";
import type { ClientRef } from "@/features/clients/types";

interface Props {
  project: Project;
  clientRefs: ClientRef[];
  open: boolean;
  onClose: () => void;
}

export function EditContractBillingDialog({ project, clientRefs, open, onClose }: Props) {
  const t = useTranslations("situations.centralizer");
  const tCommon = useTranslations("situations");
  const [state, action, pending] = useActionState(updateContractAction, null);
  const [client, setClient] = useState<ClientRef | null>(
    project.client_id != null ? clientRefs.find((c) => c.id === project.client_id) ?? null : null,
  );

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("editContract")}
          </Dialog.Title>
          <p className="mt-1 text-sm text-veltol-fgDim">{project.name}</p>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="project_id" value={project.id} />

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("columns.beneficiar")} *</Label>
              <ClientCombobox
                name="client_id"
                clients={clientRefs}
                value={client}
                onValueChange={setClient}
                aria-invalid={Boolean(state?.fieldErrors?.client_id)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("columns.contractValueEur")} *</Label>
              <CurrencyAmountInput
                amountName="value_amount"
                currencyName="value_currency"
                required
                defaultAmount={project.currency === "RON" ? project.value_lei : project.value_eur}
                defaultCurrency={project.currency}
                rate={project.conversion_rate}
                onRefreshRate={getBillingExchangeRate}
                refreshLabel={t("fields.refreshRate")}
                refreshErrorLabel={t("fields.refreshRateError")}
                aria-invalid={Boolean(state?.fieldErrors?.value_amount)}
              />
            </div>

            {state?.error && (
              <p className="text-sm text-veltol-red">{tCommon(state.error as Parameters<typeof tCommon>[0])}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline">{tCommon("cancel")}</Button>} />
              <Button type="submit" disabled={pending}>{pending ? tCommon("saving") : tCommon("save")}</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
