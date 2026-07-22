"use client";

import { useTranslations } from "next-intl";
import { ACTIVITY_STATUS_VALUES, STATUS_COLOR, type ActivityStatus } from "../types";
import { cn } from "@/shared/utils/cn";

export function MatriceLegend() {
  const t = useTranslations("matrice");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute">
        {t("legend.label")}
      </span>
      {ACTIVITY_STATUS_VALUES.map((s) => (
        <span
          key={s}
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.06em]",
            STATUS_COLOR[s as ActivityStatus],
          )}
        >
          {t(`status.${s}`)}
        </span>
      ))}
    </div>
  );
}
