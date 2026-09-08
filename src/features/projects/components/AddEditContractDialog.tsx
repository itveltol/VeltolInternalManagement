"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { SELECT_CLASS } from "@/shared/components/ui/select";
import { FormField } from "@/shared/components/ui/form-field";
import { CurrencyAmountInput } from "@/shared/components/ui/currency-amount-input";
import {
  createContractForProjectAction,
  updateContractForProjectAction,
  getExchangeRate,
} from "@/app/[locale]/(app)/projects/actions";
import type { ContractActionState } from "@/app/[locale]/(app)/projects/actions";
import { CONTRACT_TYPES } from "@/features/projects/types";
import type { ContractType } from "@/features/projects/types";
import type { Contract } from "@/features/projects/contracts/types";

interface Props {
  projectId: number;
  /** Present when editing an existing contract; absent when adding a new one. */
  contract?: Contract | null;
  /** Every contract on this project (including the one being edited, if
   * any) — used to grey out a contract_type checkbox already claimed by a
   * DIFFERENT contract, mirroring the DB's contract_claimed_types_exclusive_idx
   * constraint client-side so the conflict is visible before submitting. */
  contracts: Contract[];
  /** Suggested next contract number (see suggestNextContractNumber) — only
   * used to prefill the field when adding; editing always shows the
   * contract's own real number. */
  nextContractNumber: string;
  open: boolean;
  onClose: () => void;
}

const emptyState: ContractActionState = null;

export function AddEditContractDialog({ projectId, contract = null, contracts, nextContractNumber, open, onClose }: Props) {
  const t = useTranslations("projects");
  const tContractType = useTranslations("contractType");
  const isEdit = contract != null;
  const action = isEdit ? updateContractForProjectAction : createContractForProjectAction;
  const [state, formAction, pending] = useActionState(action, emptyState);

  const claimedByOtherContract = new Set<ContractType>(
    contracts
      .filter((c) => c.id !== contract?.id)
      .flatMap((c) => c.contract_type),
  );

  useEffect(() => {
    if (state?.success) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {isEdit ? t("contracts.editContract") : t("contracts.addContract")}
          </Dialog.Title>

          <form action={formAction} className="mt-6 space-y-4">
            <input type="hidden" name="project_id" value={projectId} />
            {isEdit && <input type="hidden" name="contract_id" value={contract.id} />}

            <FormField label={t("fields.contractType")} required>
              <div className="flex flex-wrap gap-4">
                {CONTRACT_TYPES.map((c) => {
                  const isClaimedElsewhere = claimedByOtherContract.has(c);
                  return (
                    <label
                      key={c}
                      className={
                        isClaimedElsewhere
                          ? "flex cursor-not-allowed items-center gap-2 opacity-50"
                          : "flex cursor-pointer items-center gap-2"
                      }
                    >
                      <input
                        type="checkbox"
                        name={`contract_type_${c}`}
                        value="true"
                        disabled={isClaimedElsewhere}
                        defaultChecked={!isClaimedElsewhere && contract ? contract.contract_type.includes(c) : false}
                        className="h-4 w-4 rounded border border-border bg-veltol-surface accent-veltol-accent disabled:cursor-not-allowed"
                      />
                      <span className="font-mono text-[11px] text-veltol-fgDim">{tContractType(c)}</span>
                    </label>
                  );
                })}
              </div>
              {state?.fieldErrors?.contract_type && (
                <p className="text-xs text-destructive">{t("fields.contractTypeRequired")}</p>
              )}
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label={t("fields.contractNumber")}>
                <Input
                  name="contract_number"
                  defaultValue={contract?.contract_number ?? (isEdit ? "" : nextContractNumber)}
                  aria-invalid={Boolean(state?.fieldErrors?.contract_number)}
                />
              </FormField>
              <FormField label={t("fields.contractDate")}>
                <input
                  name="contract_date"
                  type="date"
                  defaultValue={contract?.contract_date ?? ""}
                  className={SELECT_CLASS}
                  aria-invalid={Boolean(state?.fieldErrors?.contract_date)}
                />
              </FormField>
            </div>

            <FormField label={t("fields.value")}>
              <CurrencyAmountInput
                amountName="value_amount"
                currencyName="currency"
                defaultAmount={contract ? (contract.currency === "RON" ? contract.value_lei : contract.value_eur) : null}
                defaultCurrency={contract?.currency ?? "EUR"}
                rate={contract?.conversion_rate ?? null}
                onRefreshRate={isEdit ? getExchangeRate : undefined}
                refreshLabel={t("fields.refreshRate")}
                aria-invalid={Boolean(state?.fieldErrors?.value_amount)}
              />
            </FormField>

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
