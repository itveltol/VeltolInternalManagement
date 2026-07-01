"use client";

import { useTranslations } from "next-intl";
import { Paperclip } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ACTIVITY_STATUS_VALUES, STATUS_COLOR, type ActivityStatus } from "../types";
import { cn } from "@/shared/utils/cn";

interface Props {
  status: ActivityStatus;
  projectId: number;
  activityId: number;
  onChangeStatus: (projectId: number, activityId: number, status: ActivityStatus) => void;
  onOpenDocuments: () => void;
  documentCount?: number;
  disabled?: boolean;
}

export function MatriceCell({ status, projectId, activityId, onChangeStatus, onOpenDocuments, documentCount = 0, disabled }: Props) {
  const t = useTranslations("matrice");
  const tDocs = useTranslations("documents");

  return (
    <div className="flex items-center gap-0.5">
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "w-full rounded border px-1.5 py-1 text-center font-mono text-[10px] uppercase tracking-wide transition-opacity focus:outline-none",
          STATUS_COLOR[status],
          disabled ? "cursor-default opacity-60" : "cursor-pointer hover:opacity-80",
        )}
      >
        {t(`status.${status}`)}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="border-veltol-aqua/10 bg-veltol-bg text-veltol-fg"
      >
        {ACTIVITY_STATUS_VALUES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onChangeStatus(projectId, activityId, s)}
            className={cn(
              "cursor-pointer font-mono text-[11px] uppercase tracking-wide",
              s === status && "font-bold",
            )}
          >
            <span
              className={cn(
                "mr-2 inline-block h-2 w-2 rounded-full border",
                STATUS_COLOR[s],
              )}
            />
            {t(`status.${s}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpenDocuments(); }}
      title={tDocs("attachDocuments")}
      className="flex items-center gap-0.5 rounded p-0.5 text-veltol-fgMute/60 transition-colors hover:text-veltol-fgMute"
    >
      <Paperclip className="h-3 w-3" />
      {documentCount > 0 && (
        <span className="font-mono text-[9px] text-veltol-aqua">{documentCount}</span>
      )}
    </button>
    </div>
  );
}
