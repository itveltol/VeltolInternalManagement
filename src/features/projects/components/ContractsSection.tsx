"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils/formatDate";
import { deleteContractForProjectAction } from "@/app/[locale]/(app)/projects/actions";
import { AddEditContractDialog } from "./AddEditContractDialog";
import { FieldGrid, formatSourceValueWithConversion } from "./ProjectOverviewPanel";
import type { Contract } from "@/features/projects/contracts/types";

interface Props {
  projectId: number;
  contracts: Contract[];
  nextContractNumber: string;
  canMutate: boolean;
  isAdmin: boolean;
}

export function ContractsSection({ projectId, contracts, nextContractNumber, canMutate, isAdmin }: Props) {
  const t = useTranslations("projects");
  const tContractType = useTranslations("contractType");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  async function handleDelete(contractId: number) {
    const ok = await confirm({ title: t("contracts.confirmDelete"), confirmLabel: t("contracts.deleteContract") });
    if (!ok) return;
    setDeleteError(null);
    setDeletingId(contractId);
    startTransition(async () => {
      const result = await deleteContractForProjectAction(contractId, projectId);
      setDeletingId(null);
      if (result?.error) {
        setDeleteError({ id: contractId, message: t(result.error as Parameters<typeof t>[0]) });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-veltol-fgMute">
          {t("sections.contractFinancials")}
        </div>
        {canMutate && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus data-icon="inline-start" />
            {t("contracts.addContract")}
          </Button>
        )}
      </div>

      {contracts.length === 0 ? (
        <p className="text-sm text-veltol-fgMute">{t("contracts.emptyState")}</p>
      ) : (
        contracts.map((contract, i) => {
          const fields = [
            {
              label: t("fields.contractType"),
              value: contract.contract_type.length > 0
                ? contract.contract_type.map((c) => tContractType(c)).join(", ")
                : t("contracts.noValue"),
            },
            { label: t("fields.contractNumber"), value: contract.contract_number ?? t("contracts.noValue") },
            { label: t("fields.contractDate"), value: formatDate(contract.contract_date) || t("contracts.noValue") },
            {
              label: t("fields.value"),
              value: formatSourceValueWithConversion(
                contract.currency === "EUR" ? contract.value_eur : contract.value_lei,
                contract.currency,
                contract.conversion_rate,
              ),
            },
          ];

          return (
            <div key={contract.id} className={i > 0 ? "mt-3 border-t border-border pt-3" : undefined}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <FieldGrid items={fields} wide />
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="icon-sm"
                    variant="outline"
                    title={t("contracts.viewSituations")}
                    nativeButton={false}
                    render={<Link href={`/situations?contract=${contract.id}`} />}
                  >
                    <Receipt />
                  </Button>
                  {canMutate && (
                    <>
                      <Button size="icon-sm" variant="outline" title={t("contracts.editContract")} onClick={() => setEditingContract(contract)}>
                        <Pencil />
                      </Button>
                      {isAdmin && (
                        <Button
                          size="icon-sm"
                          variant="destructive"
                          title={t("contracts.deleteContract")}
                          disabled={isPending && deletingId === contract.id}
                          onClick={() => handleDelete(contract.id)}
                        >
                          {isPending && deletingId === contract.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {deleteError?.id === contract.id && (
                <p className="mt-1.5 text-[11px] text-veltol-red">{deleteError.message}</p>
              )}
            </div>
          );
        })
      )}

      {canMutate && (
        <AddEditContractDialog
          projectId={projectId}
          contracts={contracts}
          nextContractNumber={nextContractNumber}
          open={isAdding}
          onClose={() => {
            setIsAdding(false);
            router.refresh();
          }}
        />
      )}

      {canMutate && editingContract && (
        <AddEditContractDialog
          projectId={projectId}
          contract={editingContract}
          contracts={contracts}
          nextContractNumber={nextContractNumber}
          open={!!editingContract}
          onClose={() => {
            setEditingContract(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
