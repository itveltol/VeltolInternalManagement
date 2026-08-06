"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { CurrencyAmountInput } from "@/shared/components/ui/currency-amount-input";
import { updateBudgetLineAction } from "@/app/[locale]/(app)/projects/[id]/financiar-actions";
import { getExchangeRate } from "@/app/[locale]/(app)/projects/actions";
import type { CostCategory, ProjectBudgetLine } from "../types";

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

interface Props {
  line: ProjectBudgetLine;
  categories: CostCategory[];
  open: boolean;
  onClose: () => void;
}

export function EditBudgetLineDialog({ line, categories, open, onClose }: Props) {
  const t = useTranslations("financiar");
  const [state, action, pending] = useActionState(updateBudgetLineAction, null);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("editBudgetLine")}
          </Dialog.Title>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="lineId" value={line.id} />

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.costCategory")} *</Label>
              <select name="cost_category_id" required className={SELECT_CLASS} defaultValue={line.cost_category_id}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-card">{t(`category.${c.code}`)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.description")} *</Label>
              <Input name="description" required defaultValue={line.description} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.qty")} *</Label>
                <Input name="qty" type="number" min="0" step="any" required defaultValue={line.qty} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.unit")} *</Label>
                <Input name="unit" required defaultValue={line.unit} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.phaseNo")}</Label>
                <Input name="phase_no" type="number" min="0" step="1" defaultValue={line.phase_no ?? ""} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.unitPrice")} *</Label>
              <CurrencyAmountInput
                amountName="unit_price"
                currencyName="currency"
                defaultAmount={line.unit_price}
                defaultCurrency={line.currency}
                rate={line.conversion_rate}
                onRefreshRate={getExchangeRate}
                refreshLabel={t("fields.refreshRate")}
              />
            </div>

            {state?.error && (
              <p className="text-sm text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>
            )}
            {state?.success && (
              <p className="text-sm text-veltol-green">{t(state.success as Parameters<typeof t>[0])}</p>
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
