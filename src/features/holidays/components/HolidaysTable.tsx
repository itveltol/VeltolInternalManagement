"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Pagination } from "@/shared/components/ui/pagination";
import { createHoliday, deleteHoliday } from "@/app/[locale]/(app)/settings/actions";
import type { Holiday } from "../types";

const INPUT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

const PAGE_SIZE = 20;

interface Props {
  holidays: Holiday[];
}

export function HolidaysTable({ holidays }: Props) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(createHoliday, null);

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(holidays.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedHolidays = holidays.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <span className="text-xs font-medium text-veltol-fgMute">{t("officialHolidays")}</span>
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-3 border-b border-border px-6 py-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-veltol-fgMute">{t("date")}</Label>
          <input name="date" type="date" required className={INPUT_CLASS} />
        </div>
        <div className="min-w-[180px] flex-1 space-y-1.5">
          <Label className="text-[11px] font-medium text-veltol-fgMute">{t("name")}</Label>
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
            <tr className="border-b border-border">
              {[t("date"), t("name"), ""].map((col, i) => (
                <th
                  key={i}
                  className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {holidays.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                  {t("emptyState")}
                </td>
              </tr>
            ) : (
              pagedHolidays.map((holiday) => (
                <tr key={holiday.id} className="group transition-colors hover:bg-veltol-surface/50">
                  <td className="px-5 py-3.5 font-mono tabular-nums text-[12px] text-veltol-fgDim">
                    {formatDate(holiday.date)}
                  </td>
                  <td className="px-5 py-3.5 text-veltol-fg">{holiday.name}</td>
                  <td className="px-5 py-3.5">
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      title={t("delete")}
                      disabled={isPending}
                      onClick={() => handleDelete(holiday.id)}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={currentPage}
        pageCount={pageCount}
        onPageChange={setPage}
        prevLabel={t("pagination.prev")}
        nextLabel={t("pagination.next")}
        pageLabel={(p, total) => t("pagination.pageOf", { page: p, total })}
      />
    </div>
  );
}
