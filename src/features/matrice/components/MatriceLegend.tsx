"use client";

import { useTranslations } from "next-intl";
import { ACTIVITY_STATUS_VALUES, STATUS_COLOR, type ActivityStatus } from "../types";
import { cn } from "@/shared/utils/cn";

export function MatriceLegend() {
  const t = useTranslations("matrice");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ACTIVITY_STATUS_VALUES.map((s) => (
        <span
          key={s}
          className={cn(
            "inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
            STATUS_COLOR[s as ActivityStatus],
          )}
        >
          {t(`status.${s}`)}
        </span>
      ))}
    </div>
  );
}
