"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { EditClientDialog } from "./EditClientDialog";
import { deleteClientAction } from "@/app/[locale]/(app)/clients/actions";
import type { Client } from "../types";

interface Props {
  client: Client;
  canMutate: boolean;
  canDelete: boolean;
}

export function ClientInfoPanel({ client, canMutate, canDelete }: Props) {
  const t = useTranslations("clients");
  const router = useRouter();
  const confirm = useConfirm();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const ok = await confirm({
      title: t("confirmDelete"),
      confirmLabel: t("deleteClient"),
    });
    if (!ok) return;
    setIsDeleting(true);
    const result = await deleteClientAction(client.id);
    if (result?.error) {
      toast.error(t(result.error as "errorGeneric" | "errorNotAllowed"));
      setIsDeleting(false);
      return;
    }
    if (result?.success) toast.success(t(result.success as "clientDeleted"));
    router.push("/clients");
  }

  const fields: Array<{ label: string; value: React.ReactNode }> =
    client.type === "company"
      ? [
          { label: t("fields.cui"), value: client.cui ?? "—" },
          { label: t("fields.jNumber"), value: client.j_number ?? "—" },
          { label: t("fields.legalRep"), value: client.legal_rep ?? "—" },
        ]
      : [
          { label: t("fields.cnp"), value: client.cnp ?? "—" },
          { label: t("fields.idSeries"), value: client.id_series ?? "—" },
          { label: t("fields.idNumber"), value: client.id_number ?? "—" },
        ];

  fields.push(
    { label: t("fields.regAddress"), value: client.reg_address ?? "—" },
    { label: t("fields.contactPerson"), value: client.contact_person ?? "—" },
    { label: t("fields.email"), value: client.email ?? "—" },
    { label: t("fields.phone"), value: client.phone ?? "—" },
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={client.type === "company" ? "info" : "secondary"}>
              {t(`fields.type_${client.type}` as Parameters<typeof t>[0])}
            </Badge>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-veltol-fg">
            {client.name}
          </h1>
        </div>

        {(canMutate || canDelete) && (
          <div className="flex shrink-0 gap-2">
            {canMutate && (
              <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                <Pencil />
                {t("editClient")}
              </Button>
            )}
            {canDelete && (
              <Button variant="destructive" size="sm" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                {t("deleteClient")}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <div className="text-[11px] font-medium text-veltol-fgMute">{label}</div>
            <div className="mt-0.5 text-sm text-veltol-fg">{value}</div>
          </div>
        ))}
      </div>

      {client.notes && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="text-[11px] font-medium text-veltol-fgMute">{t("fields.notes")}</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-veltol-fg">{client.notes}</div>
        </div>
      )}

      {canMutate && (
        <EditClientDialog
          client={client}
          open={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
