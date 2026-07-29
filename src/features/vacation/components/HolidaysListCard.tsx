"use client";

import { useTranslations } from "next-intl";
import { formatDate } from "@/shared/utils/formatDate";
import type { Holiday } from "@/features/holidays/types";

interface Props {
  holidays: Holiday[];
}

export function HolidaysListCard({ holidays }: Props) {
  const t = useTranslations("vacation");

  if (holidays.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 text-[11px] font-medium text-veltol-fgMute">{t("officialHolidays")}</div>
      <ul className="space-y-1.5">
        {holidays.map((holiday) => (
          <li key={holiday.id} className="flex items-center justify-between text-[13px]">
            <span className="text-veltol-fgDim">{holiday.name}</span>
            <span className="font-mono tabular-nums text-[12px] text-veltol-fgMute">
              {formatDate(holiday.date)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
