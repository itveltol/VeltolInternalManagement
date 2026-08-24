"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { RefreshCw, Loader2 } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { upsertBillingAction, getBillingExchangeRate } from "@/app/[locale]/(app)/situations/actions";
import { formatConvertedCurrency, type Currency } from "@/shared/utils/currency";
import type { ProjectBilling } from "../types";

const SELECT_CLASS =
  "h-9 w-28 rounded-lg border border-border bg-veltol-surface/60 px-2 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

interface Props {
  projectId: number;
  projectName: string;
  billing: ProjectBilling | null;
  open: boolean;
  onClose: () => void;
}

export function EditContractBillingDialog({ projectId, projectName, billing, open, onClose }: Props) {
  const t = useTranslations("situations.centralizer");
  const tCommon = useTranslations("situations");
  const [state, action, pending] = useActionState(upsertBillingAction, null);
  const [currency, setCurrency] = useState<Currency>(billing?.currency ?? "EUR");
  const [invoicedNet, setInvoicedNet] = useState(billing?.invoiced_net != null ? String(billing.invoiced_net) : "0");
  const [collectedNet, setCollectedNet] = useState(billing?.collected_net != null ? String(billing.collected_net) : "0");
  const [effectiveRate, setEffectiveRate] = useState<number | null>(billing?.conversion_rate ?? null);
  const [rateRefreshed, setRateRefreshed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const rate = await getBillingExchangeRate();
      if (rate != null) {
        setEffectiveRate(rate);
        setRateRefreshed(true);
      }
    } finally {
      setRefreshing(false);
    }
  }

  const otherCurrency: Currency = currency === "EUR" ? "RON" : "EUR";

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("editBilling")}
          </Dialog.Title>
          <p className="mt-1 text-sm text-veltol-fgDim">{projectName}</p>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="invoiced_net_refresh_rate" value={rateRefreshed ? "true" : "false"} />

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.currency")}</Label>
              <select
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className={SELECT_CLASS}
                aria-invalid={Boolean(state?.fieldErrors?.currency)}
              >
                <option value="EUR" className="bg-card">EUR</option>
                <option value="RON" className="bg-card">RON</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.invoicedNet")} *</Label>
              <Input
                name="invoiced_net"
                type="number"
                min="0"
                step="any"
                required
                value={invoicedNet}
                onChange={(e) => setInvoicedNet(e.target.value)}
                aria-invalid={Boolean(state?.fieldErrors?.invoiced_net)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.collectedNet")} *</Label>
              <Input
                name="collected_net"
                type="number"
                min="0"
                step="any"
                required
                value={collectedNet}
                onChange={(e) => setCollectedNet(e.target.value)}
                aria-invalid={Boolean(state?.fieldErrors?.collected_net)}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="font-mono text-[11px] text-veltol-fgMute">
                {formatConvertedCurrency(Number(invoicedNet) || 0, currency, effectiveRate)}
                {" "}
                {t("fields.invoicedInOther", { currency: otherCurrency })}
                {rateRefreshed && <span className="ml-1 text-veltol-accent">({t("fields.rateRefreshed")})</span>}
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                title={t("fields.refreshRate")}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] text-veltol-fgMute transition-colors hover:text-veltol-accent disabled:opacity-50"
              >
                {refreshing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.notes")}</Label>
              <Textarea name="notes" defaultValue={billing?.notes ?? ""} rows={3} aria-invalid={Boolean(state?.fieldErrors?.notes)} />
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
