"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { AddClientDialog } from "./AddClientDialog";
import { EditClientDialog } from "./EditClientDialog";
import { deleteClientAction } from "@/app/[locale]/(app)/clients/actions";
import { useClientsStore } from "../hooks/useClientsStore";
import type { Client } from "../types";

interface Props {
  clients: Client[];
  canMutate: boolean;
}

export function ClientsTable({ clients, canMutate }: Props) {
  const t = useTranslations("clients");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    isAddDialogOpen, editingClient, deletingId,
    openAddDialog, closeAddDialog,
    openEditDialog, closeEditDialog,
    setDeletingId,
  } = useClientsStore();

  function handleDelete(clientId: number) {
    if (!confirm(t("confirmDelete"))) return;
    setDeletingId(clientId);
    startTransition(async () => {
      await deleteClientAction(clientId);
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="v-panel v-hairline overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <span className="mono-label text-[10px] text-veltol-fgMute">
              {t("totalCount", { count: clients.length })}
            </span>
          </div>
          {canMutate && (
            <Button onClick={openAddDialog} variant="outline">
              {t("addClient")}
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {[
                  t("columns.name"), t("columns.type"), t("columns.taxId"),
                  t("columns.address"), t("columns.contact"), t("columns.email"), t("columns.phone"), "",
                ].map((col, i) => (
                  <th key={i} className="px-5 py-3 text-left font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="group transition-colors hover:bg-veltol-surface/30">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-veltol-fg">{client.name}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <Badge variant={client.type === "company" ? "info" : "secondary"}>
                        {t(`fields.type_${client.type}` as Parameters<typeof t>[0])}
                      </Badge>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-[11px] text-veltol-fgDim">
                      {client.type === "company"
                        ? (client.cui ?? "—")
                        : (client.cnp ?? "—")}
                    </td>

                    <td className="px-5 py-3.5 text-[12px] text-veltol-fgDim max-w-[180px] truncate">
                      {client.reg_address ?? "—"}
                    </td>

                    <td className="px-5 py-3.5 text-[12px] text-veltol-fgDim">
                      {client.contact_person ?? "—"}
                    </td>

                    <td className="px-5 py-3.5 text-[12px] text-veltol-fgDim">
                      {client.email ?? "—"}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-[11px] text-veltol-fgDim">
                      {client.phone ?? "—"}
                    </td>

                    <td className="px-5 py-3.5">
                      {canMutate && (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(client)}>
                            {t("editClient")}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isPending && deletingId === client.id}
                            onClick={() => handleDelete(client.id)}
                          >
                            {isPending && deletingId === client.id ? "..." : t("deleteClient")}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddClientDialog
        open={isAddDialogOpen}
        onClose={() => {
          closeAddDialog();
          router.refresh();
        }}
      />

      {editingClient && (
        <EditClientDialog
          client={editingClient}
          open={!!editingClient}
          onClose={() => {
            closeEditDialog();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
