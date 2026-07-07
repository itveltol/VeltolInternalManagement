"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { createHoliday, deleteHoliday } from "@/app/[locale]/(app)/settings/actions";
import type { Holiday } from "../types";

const INPUT_CLASS =
  "h-8 w-full rounded-lg border border-white/10 bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-aqua/50 focus:ring-2 focus:ring-veltol-aqua/20";

interface Props {
  holidays: Holiday[];
}

export function HolidaysTable({ holidays }: Props) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(createHoliday, null);

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state?.success]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(
      locale === "hu" ? "hu-HU" : locale === "ro" ? "ro-RO" : "en-GB",
      { year: "numeric", month: "2-digit", day: "2-digit" },
    );
  }

  function handleDelete(id: number) {
    if (!confirm(t("confirmDeleteHoliday"))) return;
    startTransition(async () => {
      await deleteHoliday(id);
      router.refresh();
    });
  }

  return (
    <div className="v-panel v-hairline overflow-hidden rounded-xl">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <span className="mono-label text-[10px] text-veltol-fgMute">{t("officialHolidays")}</span>
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-3 border-b border-white/[0.06] px-6 py-4">
        <div className="space-y-1.5">
          <Label className="mono-label text-[9px] text-veltol-fgMute">{t("date")}</Label>
          <input name="date" type="date" required className={INPUT_CLASS} />
        </div>
        <div className="min-w-[180px] flex-1 space-y-1.5">
          <Label className="mono-label text-[9px] text-veltol-fgMute">{t("name")}</Label>
          <input name="name" type="text" required className={INPUT_CLASS} />
        </div>
        <Button type="submit" disabled={pending} variant="outline">
          {pending ? t("saving") : t("addHoliday")}
        </Button>
      </form>

      {state?.error && (
        <p className="px-6 pt-3 text-sm text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {[t("date"), t("name"), ""].map((col, i) => (
                <th
                  key={i}
                  className="px-5 py-3 text-left font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {holidays.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                  {t("emptyState")}
                </td>
              </tr>
            ) : (
              holidays.map((holiday) => (
                <tr key={holiday.id} className="group transition-colors hover:bg-veltol-surface/30">
                  <td className="px-5 py-3.5 font-mono tabular-nums text-[12px] text-veltol-fgDim">
                    {formatDate(holiday.date)}
                  </td>
                  <td className="px-5 py-3.5 text-veltol-fg">{holiday.name}</td>
                  <td className="px-5 py-3.5">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isPending}
                      onClick={() => handleDelete(holiday.id)}
                    >
                      {t("delete")}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
