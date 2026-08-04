"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatCurrency } from "@/shared/utils/currency";
import { formatDate } from "@/shared/utils/formatDate";
import { computeSituationFigures, findPreviousFinalized } from "../services/situationService";
import { FinalizeSituationDialog } from "./FinalizeSituationDialog";
import type { SituationWithProject } from "../types";

interface Props {
  situation: SituationWithProject;
  situations: SituationWithProject[];
  canMutate: boolean;
  onBack: () => void;
}

export function SituationDetail({ situation, situations, canMutate, onBack }: Props) {
  const t = useTranslations("situations");
  const router = useRouter();
  const [isFinalizeOpen, setFinalizeOpen] = useState(false);

  const isFinal = situation.status === "final";

  const siblings = situations.filter((s) => s.project_id === situation.project_id);
  const previous = findPreviousFinalized(siblings, situation.id);
  const figures = computeSituationFigures(situation, situation.project, previous?.pct_snapshot ?? 0);

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={onBack}>
        <ArrowLeft data-icon="inline-start" />
        {t("title")}
      </Button>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <Link
              href={`/projects/${situation.project.id}`}
              className="text-sm font-medium text-veltol-accent hover:underline"
            >
              {situation.project.name}
            </Link>
            <div className="mt-1 flex items-center gap-3">
              <h2 className="text-lg font-semibold text-veltol-fg">{situation.name}</h2>
              <Badge variant={isFinal ? "success" : "secondary"}>{t(`status.${situation.status}`)}</Badge>
            </div>
            <div className="mt-1 font-mono text-[11px] text-veltol-fgMute">
              {formatDate(situation.created_at)}
            </div>
          </div>

          {canMutate && !isFinal && (
            <Button onClick={() => setFinalizeOpen(true)}>
              {t("finalize")}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-3">
          <div className="text-center">
            <div className="text-[11px] font-medium text-veltol-fgMute">{t("columns.pct")}</div>
            <div className="mt-1 font-mono text-[32px] font-bold tabular-nums text-veltol-accent">
              {figures.pct != null ? `${Math.round(figures.pct)}%` : "—"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[11px] font-medium text-veltol-fgMute">{t("columns.amountEur")}</div>
            <div className="mt-1 font-mono text-[22px] font-semibold text-veltol-fg">
              {formatCurrency(figures.amountEur, "EUR")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[11px] font-medium text-veltol-fgMute">{t("columns.amountLei")}</div>
            <div className="mt-1 font-mono text-[22px] font-semibold text-veltol-fg">
              {formatCurrency(figures.amountLei, "lei")}
            </div>
          </div>
        </div>
      </div>

      <FinalizeSituationDialog
        situationId={situation.id}
        projectId={situation.project.id}
        open={isFinalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        onFinalized={() => {
          setFinalizeOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
