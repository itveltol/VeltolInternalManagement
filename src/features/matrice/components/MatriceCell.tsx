"use client";

import { memo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Paperclip, MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ACTIVITY_STATUS_VALUES, STATUS_COLOR, STATUS_DOT_COLOR, type ActivityStatus } from "../types";
import { AvizExpiryDialog } from "./AvizExpiryDialog";
import { cn } from "@/shared/utils/cn";

interface Props {
  status: ActivityStatus;
  projectId: number;
  activityId: number;
  activityName?: string;
  expiresRequired?: boolean;
  expiresAt?: string | null;
  /** Names of prerequisite activities not yet finalized — non-empty blocks the "finalizat" transition. */
  unmetDependencyNames?: string[];
  onChangeStatus: (projectId: number, activityId: number, status: ActivityStatus, expiresAt?: string | null) => void;
  onOpenDocuments: (projectId: number, activityId: number) => void;
  onOpenDiscussion: (projectId: number, activityId: number) => void;
  documentCount?: number;
  discussionCount?: number;
  /** True when this activity doesn't apply to the project's type — status can't be hand-edited. */
  disabled?: boolean;
  /** True while this cell's own status change is saving. */
  pending?: boolean;
}

export const MatriceCell = memo(function MatriceCell({ status, projectId, activityId, activityName = "", expiresRequired, expiresAt, unmetDependencyNames = [], onChangeStatus, onOpenDocuments, onOpenDiscussion, documentCount = 0, discussionCount = 0, disabled, pending }: Props) {
  const t = useTranslations("matrice");
  const tDocs = useTranslations("documents");
  const tComms = useTranslations("comms");
  const isDisabled = disabled || pending;
  const [pendingExpiryPrompt, setPendingExpiryPrompt] = useState(false);

  function applyStatus(s: ActivityStatus) {
    if (s === "finalizat" && unmetDependencyNames.length > 0) {
      toast.error(t("errorUnmetDependency", { names: unmetDependencyNames.join(", ") }));
      return;
    }
    if (s === "finalizat" && expiresRequired) {
      setPendingExpiryPrompt(true);
      return;
    }
    onChangeStatus(projectId, activityId, s);
  }

  function handleConfirmExpiry(newExpiresAt: string) {
    setPendingExpiryPrompt(false);
    onChangeStatus(projectId, activityId, "finalizat", newExpiresAt);
  }

  return (
    <div className="flex items-center gap-1">
    <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isDisabled}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-center text-[11px] font-bold uppercase tracking-[.06em] transition-opacity focus:outline-none",
          STATUS_COLOR[status],
          isDisabled ? "cursor-default opacity-60" : "cursor-pointer hover:opacity-80",
        )}
      >
        {pending && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
        {t(`status.${status}`)}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="border-border bg-popover text-veltol-fg"
      >
        {ACTIVITY_STATUS_VALUES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => applyStatus(s)}
            className={cn(
              "cursor-pointer text-[13px] font-medium",
              s === status && "font-bold",
            )}
          >
            <span
              className={cn(
                "mr-2 inline-block h-2 w-2 rounded-full",
                STATUS_DOT_COLOR[s],
              )}
            />
            {t(`status.${s}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    {expiresRequired && status === "finalizat" && expiresAt && (
      <span className="text-[10px] font-medium tabular-nums text-veltol-fgMute">
        {t("grid.expiresOn", { date: expiresAt })}
      </span>
    )}
    </div>
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpenDocuments(projectId, activityId); }}
      aria-label={tDocs("attachDocuments")}
      className="flex min-h-8 min-w-8 items-center justify-center gap-0.5 rounded p-1.5 text-veltol-faint transition-colors hover:bg-veltol-hover hover:text-veltol-fgMute"
    >
      <Paperclip className="h-3 w-3" />
      {documentCount > 0 && (
        <span className="text-[10px] font-semibold text-veltol-primary">{documentCount}</span>
      )}
    </button>
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpenDiscussion(projectId, activityId); }}
      aria-label={tComms("discussion")}
      className="flex min-h-8 min-w-8 items-center justify-center gap-0.5 rounded p-1.5 text-veltol-faint transition-colors hover:bg-veltol-hover hover:text-veltol-fgMute"
    >
      <MessageSquare className="h-3 w-3" />
      {discussionCount > 0 && (
        <span className="text-[10px] font-semibold text-veltol-primary">{discussionCount}</span>
      )}
    </button>
    {expiresRequired && (
      <AvizExpiryDialog
        open={pendingExpiryPrompt}
        activityName={activityName}
        onConfirm={handleConfirmExpiry}
        onCancel={() => setPendingExpiryPrompt(false)}
      />
    )}
    </div>
  );
});
