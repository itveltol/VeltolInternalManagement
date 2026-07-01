"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { deleteDocumentAction } from "@/app/[locale]/(app)/documents/actions";
import type { Document, DocumentLinkedType } from "../types";

interface Props {
  documents: Document[];
  canMutate: boolean;
  search: string;
  onSearchChange: (v: string) => void;
}

const INPUT_CLASS =
  "h-8 w-64 rounded-lg border border-white/10 bg-veltol-surface/60 px-2.5 py-1 font-mono text-[12px] text-veltol-fg outline-none placeholder:text-veltol-fgMute focus:border-veltol-aqua/50 focus:ring-2 focus:ring-veltol-aqua/20";

function linkedTypeVariant(type: DocumentLinkedType) {
  switch (type) {
    case "project":        return "default";
    case "client":         return "outline";
    case "matrice_cell":   return "secondary";
    case "checklist_item": return "secondary";
    default:               return "outline";
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function expiryState(expiresAt: string | null): "expired" | "soon" | "ok" | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff < 0) return "expired";
  if (diff < 30 * 24 * 60 * 60 * 1000) return "soon";
  return "ok";
}

export function DocumentsTable({ documents, canMutate, search, onSearchChange }: Props) {
  const t = useTranslations("documents");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(doc: Document) {
    if (!confirm(t("confirmDelete"))) return;
    startTransition(async () => {
      await deleteDocumentAction(doc.id, doc.project_id ?? undefined);
      router.refresh();
    });
  }

  return (
    <div className="v-panel v-hairline overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-4">
        <span className="mono-label text-[10px] text-veltol-fgMute">
          {t("totalCount", { count: documents.length })}
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("fields.namePlaceholder")}
          className={INPUT_CLASS}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {[
                t("columns.name"),
                t("columns.linkedTo"),
                t("columns.date"),
                t("columns.expiry"),
                t("columns.actions"),
              ].map((col, i) => (
                <th
                  key={i}
                  className="px-5 py-3 text-left font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                  {t("emptyState")}
                </td>
              </tr>
            ) : (
              documents.map((doc) => {
                const expiry = expiryState(doc.expires_at);
                return (
                  <tr key={doc.id} className="group transition-colors hover:bg-veltol-surface/30">
                    <td className="px-5 py-3">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[12px] text-veltol-aqua underline-offset-2 hover:underline"
                      >
                        {doc.name}
                      </a>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge variant={linkedTypeVariant(doc.linked_type)} className="w-fit font-mono text-[9px]">
                          {t(`linkedType.${doc.linked_type}`)}
                        </Badge>
                        {doc.project && (
                          <span className="font-mono text-[11px] text-veltol-fgDim">{doc.project.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-veltol-fgMute">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        {doc.is_renewable && (
                          <Badge variant="secondary" className="w-fit font-mono text-[9px]">
                            {t("renewable")}
                          </Badge>
                        )}
                        {doc.expires_at && (
                          <span className={
                            expiry === "expired" ? "font-mono text-[11px] text-veltol-red" :
                            expiry === "soon"    ? "font-mono text-[11px] text-amber-400" :
                                                   "font-mono text-[11px] text-veltol-fgMute"
                          }>
                            {expiry === "expired" ? t("expired") : t("expiresOn", { date: formatDate(doc.expires_at) })}
                          </span>
                        )}
                        {!doc.is_renewable && !doc.expires_at && (
                          <span className="font-mono text-[11px] text-veltol-fgMute">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 px-2.5 font-mono text-[11px] text-veltol-fgDim transition-colors hover:border-veltol-aqua/30 hover:text-veltol-aqua"
                        >
                          {t("openDocument")}
                        </a>
                        {canMutate && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isPending}
                            onClick={() => handleDelete(doc)}
                          >
                            {t("delete")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
