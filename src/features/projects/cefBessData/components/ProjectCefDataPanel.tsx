"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { EditCefDataDialog } from "./EditCefDataDialog";
import type { ProjectCefData } from "../types";

interface Props {
  projectId: number;
  data: ProjectCefData | null;
  canMutate: boolean;
}

function formatNumber(v: number | null) {
  return v != null ? String(v) : "—";
}

export function ProjectCefDataPanel({ projectId, data, canMutate }: Props) {
  const tCef = useTranslations("projects.cefData");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSession, setEditSession] = useState(0);

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: tCef("putereInstalata"), value: formatNumber(data?.putere_instalata ?? null) },
    { label: tCef("putereDebitata"), value: formatNumber(data?.putere_debitata ?? null) },
    { label: tCef("tipPanou"), value: data?.tip_panou || "—" },
    { label: tCef("tipInvertor"), value: data?.tip_invertor || "—" },
    { label: tCef("tipStructura"), value: data?.tip_structura || "—" },
    { label: tCef("tipGard"), value: data?.tip_gard || "—" },
    { label: tCef("ridicareTopo"), value: data?.ridicare_topo || "—" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-veltol-fgMute">
          {tCef("title")}
        </div>
        {canMutate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditSession((n) => n + 1);
              setIsEditOpen(true);
            }}
          >
            <Pencil />
            {tCef("editButton")}
          </Button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <div className="text-[12px] font-medium text-veltol-fgMute">{label}</div>
            <div className="mt-0.5 text-[15px] text-veltol-fg">{value}</div>
          </div>
        ))}
      </div>

      {canMutate && (
        <EditCefDataDialog
          key={editSession}
          projectId={projectId}
          data={data}
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </div>
  );
}
