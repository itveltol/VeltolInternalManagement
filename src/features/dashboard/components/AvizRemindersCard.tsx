"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/shared/components/ui/badge";
import { Pagination } from "@/shared/components/ui/pagination";
import { FilterField, FilterInput } from "@/shared/components/ui/filter-field";
import { Link } from "@/i18n/navigation";
import type { AvizReminder } from "@/features/matrice/types";

const PAGE_SIZE = 5;

interface Props {
  reminders: AvizReminder[];
}

export function AvizRemindersCard({ reminders }: Props) {
  const t = useTranslations("matrice");
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
          <span className="text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute">{t("avizReminders.eyebrow")}</span>
          <h2 className="mt-0.5 text-[20px] font-bold text-veltol-fg">{t("avizReminders.title")}</h2>
        </div>
        <FilterField label={t("avizReminders.searchPlaceholder")} htmlFor="aviz-reminders-search">
          <FilterInput
            id="aviz-reminders-search"
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("avizReminders.searchPlaceholder")}
            className="w-48"
          />
        </FilterField>
      </div>

      <div className="h-px bg-border" />

      {reminders.length === 0 ? (
        <div className="px-5 py-6 text-sm text-veltol-fgMute">{t("avizReminders.empty")}</div>
      ) : filteredReminders.length === 0 ? (
        <div className="px-5 py-6 text-sm text-veltol-fgMute">{t("avizReminders.noResults")}</div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {pagedReminders.map((reminder) => (
              <Link
                key={`${reminder.projectId}-${reminder.activityId}`}
                href="/matrice-status"
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-veltol-hover"
              >
                <div className="min-w-0 flex-1">
                  <span className="truncate text-[14px] font-semibold text-veltol-fg">{reminder.projectName}</span>
                  <div className="truncate text-[12px] text-veltol-fgMute">{reminder.activityName}</div>
                </div>
                <Badge variant="warning">{t("avizReminders.expiresOn", { date: reminder.expiresAt })}</Badge>
              </Link>
            ))}
          </div>

          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            prevLabel={t("avizReminders.pagination.prev")}
            nextLabel={t("avizReminders.pagination.next")}
            pageLabel={(page, total) => t("avizReminders.pagination.pageOf", { page, total })}
          />
        </>
      )}
    </div>
  );
}
