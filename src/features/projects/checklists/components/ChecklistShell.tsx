"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChecklistTable } from "./ChecklistTable";
import type { ChecklistRow } from "@/features/projects/checklists/types";

interface Props {
  rows: ChecklistRow[];
  projectId: number;
  canMutate: boolean;
  peopleNeeded: number | null;
}

export function ChecklistShell({ rows, projectId, canMutate, peopleNeeded }: Props) {
  const t = useTranslations("checklist");
  const noPeopleNeeded = !peopleNeeded || peopleNeeded <= 0;

  return (
    <div className="flex flex-col gap-3">
      {noPeopleNeeded && (
        <div className="flex items-start gap-2 rounded-lg border border-veltol-orange/30 bg-veltol-orange/10 px-4 py-2 text-sm text-veltol-orange">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{t("noPeopleNeededBanner")}</span>
        </div>
      )}
      <ChecklistTable rows={rows} projectId={projectId} canMutate={canMutate} peopleNeeded={peopleNeeded} />
    </div>
  );
}
