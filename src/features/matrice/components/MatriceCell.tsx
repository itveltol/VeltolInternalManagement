"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Paperclip } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ACTIVITY_STATUS_VALUES, STATUS_COLOR, STATUS_DOT_COLOR, type ActivityStatus } from "../types";
import { cn } from "@/shared/utils/cn";

interface Props {
  status: ActivityStatus;
  projectId: number;
  activityId: number;
  onChangeStatus: (projectId: number, activityId: number, status: ActivityStatus) => void;
  onOpenDocuments: (projectId: number, activityId: number) => void;
  documentCount?: number;
  disabled?: boolean;
  /** True while this cell's own status change is saving. */
  pending?: boolean;
}

export const MatriceCell = memo(function MatriceCell({ status, projectId, activityId, onChangeStatus, onOpenDocuments, documentCount = 0, disabled, pending }: Props) {
  const t = useTranslations("matrice");
  const tDocs = useTranslations("documents");
  const isDisabled = disabled || pending;

  return (
    <div className="flex items-center gap-1">
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
            onClick={() => onChangeStatus(projectId, activityId, s)}
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
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpenDocuments(projectId, activityId); }}
      title={tDocs("attachDocuments")}
      className="flex items-center gap-0.5 rounded p-0.5 text-veltol-faint transition-colors hover:text-veltol-fgMute"
    >
      <Paperclip className="h-3 w-3" />
      {documentCount > 0 && (
        <span className="text-[10px] font-semibold text-veltol-primary">{documentCount}</span>
      )}
    </button>
    </div>
  );
});
