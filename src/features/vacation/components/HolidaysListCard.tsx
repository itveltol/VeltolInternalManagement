"use client";

import { useTranslations, useLocale } from "next-intl";
import type { Holiday } from "@/features/holidays/types";

interface Props {
  holidays: Holiday[];
}

export function HolidaysListCard({ holidays }: Props) {
  const t = useTranslations("vacation");
  const locale = useLocale();

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(
      locale === "hu" ? "hu-HU" : locale === "ro" ? "ro-RO" : "en-GB",
      { year: "numeric", month: "2-digit", day: "2-digit" },
    );
  }

  if (holidays.length === 0) return null;

  return (
    <div className="v-panel v-hairline rounded-xl p-5">
      <div className="mono-label mb-3 text-[9px] text-veltol-fgMute">{t("officialHolidays")}</div>
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
