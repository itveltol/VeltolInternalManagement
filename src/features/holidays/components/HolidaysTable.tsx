"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Pagination } from "@/shared/components/ui/pagination";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import { DataCardList, DataCard, DataCardField, DataCardFooter } from "@/shared/components/ui/data-card";
import { createHoliday, deleteHoliday } from "@/app/[locale]/(app)/settings/actions";
import { formatDate } from "@/shared/utils/formatDate";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import type { Holiday } from "../types";

const INPUT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

const PAGE_SIZE = 20;

interface Props {
  holidays: Holiday[];
}

export function HolidaysTable({ holidays }: Props) {
  const t = useTranslations("settings");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(createHoliday, null);

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(holidays.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedHolidays = holidays.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (state?.success) {
      toast.success(t(state.success as "holidayCreated"));
      router.refresh();
    }
  }, [state?.success]);

  async function handleDelete(id: number) {
    const ok = await confirm({ title: t("confirmDeleteHoliday"), confirmLabel: t("delete") });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteHoliday(id);
      if (result?.error) toast.error(t(result.error as "errorGeneric" | "errorNotAllowed"));
      else if (result?.success) toast.success(t(result.success as "holidayDeleted"));
      router.refresh();
    });
  }

  return (
    <TableShell>
      <TableToolbar>
        <span className="text-xs font-medium text-veltol-fgMute">{t("officialHolidays")}</span>
      </TableToolbar>

      <form action={formAction} className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-4 md:px-6">
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
        <p className="px-4 pt-3 text-sm text-veltol-red md:px-6">{t(state.error as Parameters<typeof t>[0])}</p>
      )}

      <TableDesktopView>
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
      </TableDesktopView>

      {holidays.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("emptyState")}</p>
      ) : (
        <DataCardList>
          {pagedHolidays.map((holiday) => (
            <DataCard key={holiday.id}>
              <DataCardField label={t("date")}>{formatDate(holiday.date)}</DataCardField>
              <p className="text-[14px] font-medium text-veltol-fg">{holiday.name}</p>
              <DataCardFooter>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={isPending}
                  onClick={() => handleDelete(holiday.id)}
                >
                  <Trash2 data-icon="inline-start" /> {t("delete")}
                </Button>
              </DataCardFooter>
            </DataCard>
          ))}
        </DataCardList>
      )}

      <Pagination
        page={currentPage}
        pageCount={pageCount}
        onPageChange={setPage}
        prevLabel={t("pagination.prev")}
        nextLabel={t("pagination.next")}
        pageLabel={(p, total) => t("pagination.pageOf", { page: p, total })}
      />
    </TableShell>
  );
}
