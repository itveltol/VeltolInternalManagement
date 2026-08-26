"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { EditBessDataDialog } from "./EditBessDataDialog";
import type { ProjectBessData } from "../types";

interface Props {
  projectId: number;
  data: ProjectBessData | null;
  canMutate: boolean;
}

function formatNumber(v: number | null) {
  return v != null ? String(v) : "—";
}

export function ProjectBessDataPanel({ projectId, data, canMutate }: Props) {
  const tBess = useTranslations("projects.bessData");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSession, setEditSession] = useState(0);

  const incarcareLabel =
    data?.incarcare_din_retea === true
      ? tBess("withGridCharging")
      : data?.incarcare_din_retea === false
        ? tBess("withoutGridCharging")
        : "—";

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: tBess("putereInstalata"), value: formatNumber(data?.putere_instalata ?? null) },
    { label: tBess("putereDescarcare"), value: formatNumber(data?.putere_descarcare ?? null) },
    { label: tBess("incarcareDinRetea"), value: incarcareLabel },
    { label: tBess("tipBess"), value: data?.tip_bess || "—" },
    { label: tBess("tipPcs"), value: data?.tip_pcs || "—" },
    { label: tBess("ridicareTopo"), value: data?.ridicare_topo || "—" },
    { label: tBess("detaliiTrafo"), value: data?.detalii_trafo || "—" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-veltol-fgMute">
          {tBess("title")}
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
            {tBess("editButton")}
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
        <EditBessDataDialog
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
