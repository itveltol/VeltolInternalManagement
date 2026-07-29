"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/shared/components/ui/badge";
import { Pagination } from "@/shared/components/ui/pagination";
import { FilterField, FilterInput } from "@/shared/components/ui/filter-field";
import { Link } from "@/i18n/navigation";
import type { MaintenanceReminder } from "@/app/[locale]/(app)/dashboard/action";

const PAGE_SIZE = 5;

interface Props {
  reminders: MaintenanceReminder[];
}

export function MaintenanceRemindersCard({ reminders }: Props) {
  const t = useTranslations("maintenance");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredReminders = reminders.filter((r) =>
    r.projectName.toLowerCase().includes(search.trim().toLowerCase())
  );

  const pageCount = Math.max(1, Math.ceil(filteredReminders.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedReminders = filteredReminders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="relative overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-end justify-between gap-3 p-5">
        <div>
          <span className="text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute">{t("remindersEyebrow")}</span>
          <h2 className="mt-0.5 text-[20px] font-bold text-veltol-fg">{t("remindersTitle")}</h2>
        </div>
        <FilterField label={t("remindersSearchPlaceholder")} htmlFor="maintenance-reminders-search">
          <FilterInput
            id="maintenance-reminders-search"
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("remindersSearchPlaceholder")}
            className="w-48"
          />
        </FilterField>
      </div>

      <div className="h-px bg-border" />

      {reminders.length === 0 ? (
        <div className="px-5 py-6 text-sm text-veltol-fgMute">{t("remindersEmpty")}</div>
      ) : filteredReminders.length === 0 ? (
        <div className="px-5 py-6 text-sm text-veltol-fgMute">{t("remindersNoResults")}</div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {pagedReminders.map((reminder) => (
              <Link
                key={`${reminder.projectId}-${reminder.year}-${reminder.period}`}
                href={`/projects/${reminder.projectId}?tab=maintenance`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-veltol-hover"
              >
                <div className="min-w-0 flex-1">
                  <span className="truncate text-[14px] font-semibold text-veltol-fg">{reminder.projectName}</span>
                </div>
                <Badge variant="warning">{t(`period.${reminder.period}`, { year: reminder.year })}</Badge>
              </Link>
            ))}
          </div>

          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            prevLabel={t("pagination.prev")}
            nextLabel={t("pagination.next")}
            pageLabel={(page, total) => t("pagination.pageOf", { page, total })}
          />
        </>
      )}
    </div>
  );
}
