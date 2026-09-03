"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { Badge } from "@/shared/components/ui/badge";
import { ProjectPmSalesChips } from "./ProjectPmSalesChips";
import { removeAssignmentFromDayAction } from "@/app/[locale]/(app)/schedule/actions";
import { abbreviateName } from "../utils/abbreviateName";
import { memberInitials } from "../utils/memberInitials";
import { pmColor } from "../utils/pmColor";
import type { ScheduleDayCard } from "../types";

interface Props {
  card: ScheduleDayCard;
  canMutate: boolean;
  onEdit: () => void;
  /** Admin-assigned PM -> color overrides; falls back to a deterministic hash for PMs without one. */
  pmColors?: ReadonlyMap<string, string>;
}

export function DayAssignmentCard({ card, canMutate, onEdit, pmColors }: Props) {
  const t = useTranslations("schedule");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const accent = pmColor(card.pm?.id, pmColors);
  const title = card.project_name ?? card.label;
  const showLabelTag = card.label && card.project_name; // avoid duplicating the label when it's already the title

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await confirm({
      title: t("entry.confirmRemoveFromDay"),
      tone: "danger",
      confirmLabel: t("entry.removeFromDay"),
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await removeAssignmentFromDayAction(card.assignment_id, card.day.work_date);
      if (result?.error) toast.error(t(result.error as "errorGeneric" | "errorNotAllowed"));
      else {
        if (result?.success) toast.success(t(result.success as "entryDeleted"));
        router.refresh();
      }
    });
  }

  return (
    <div
      role={canMutate ? "button" : undefined}
      tabIndex={canMutate ? 0 : undefined}
      onClick={canMutate ? onEdit : undefined}
      onKeyDown={canMutate ? (e) => { if (e.key === "Enter") onEdit(); } : undefined}
      className={`flex flex-col gap-2 rounded-lg border border-border border-l-4 p-3 shadow-sm transition-colors ${
        canMutate ? "cursor-pointer hover:brightness-[0.98]" : ""
      }`}
      style={{ borderLeftColor: accent, backgroundColor: `${accent}1F` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-veltol-fg">{title}</span>
          {showLabelTag && (
            <span className="block truncate text-[12px] text-veltol-fgMute">{card.label}</span>
          )}
        </div>
        {canMutate && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            title={t("entry.removeFromDay")}
            className="shrink-0 rounded-md p-1 text-veltol-fgMute transition-colors hover:bg-veltol-hover hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <ProjectPmSalesChips manager={card.pm} sales={card.sales} />

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">
          {card.rowGroup.kind === "team" ? card.rowGroup.team_name : t("roster.custom")}
        </Badge>
        {card.day.delegated && <Badge variant="secondary">{t("entry.delegation")}</Badge>}
        {card.day.plus_hours > 0 && <Badge variant="secondary">+{card.day.plus_hours}h</Badge>}
      </div>

      {/* Member avatars, initials-badge style */}
      <div className="flex flex-col gap-1.5 border-t border-border/70 pt-2">
        {card.day.assignees.map((a) => (
          <div
            key={a.assignee.id}
            title={a.assignee.name}
            className={`flex items-center gap-1.5 ${a.onVacation ? "opacity-50" : ""}`}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-veltol-tint text-[9px] font-bold text-veltol-accent">
              {memberInitials(a.assignee.name)}
            </span>
            <span className={`text-[12px] text-veltol-fg ${a.onVacation ? "line-through" : ""}`}>
              {abbreviateName(a.assignee.name)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
