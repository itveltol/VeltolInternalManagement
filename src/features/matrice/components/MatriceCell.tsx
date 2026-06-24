"use client";

import { useTranslations } from "next-intl";
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
  disabled?: boolean;
}

export function MatriceCell({ status, projectId, activityId, onChangeStatus, disabled }: Props) {
  const t = useTranslations("matrice");

  return (
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
  );
}
