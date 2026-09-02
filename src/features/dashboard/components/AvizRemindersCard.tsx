"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Pagination } from "@/shared/components/ui/pagination";
import { FilterField, FilterDropdown, FilterInput } from "@/shared/components/ui/filter-field";
import { Link } from "@/i18n/navigation";
import type { AvizReminder, AvizState } from "@/features/matrice/types";

const PAGE_SIZE = 5;

const BADGE_VARIANT: Record<AvizState, "destructive" | "warning" | "secondary"> = {
  overdue: "destructive",
  dueSoon: "warning",
  notDue: "secondary",
  noExpiry: "secondary",
};

type SortDir = "asc" | "desc" | null;

interface Props {
  reminders: AvizReminder[];
}

export function AvizRemindersCard({ reminders }: Props) {
  const t = useTranslations("matrice");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AvizState | "">("");
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  const statusFiltered = reminders.filter((r) =>
    status === "" ? r.state === "overdue" || r.state === "dueSoon" : r.state === status
  );
  const filteredReminders = statusFiltered.filter((r) =>
    r.projectName.toLowerCase().includes(search.trim().toLowerCase())
  );
  if (sortDir) {
    filteredReminders.sort((a, b) =>
      sortDir === "asc" ? a.expiresAt.localeCompare(b.expiresAt) : b.expiresAt.localeCompare(a.expiresAt)
    );
  }

  const pageCount = Math.max(1, Math.ceil(filteredReminders.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedReminders = filteredReminders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatus(value as AvizState | "");
    setPage(1);
  }

  function cycleSortDir() {
    setSortDir(sortDir === null ? "desc" : sortDir === "desc" ? "asc" : null);
    setPage(1);
  }

  const SortIcon = sortDir === "asc" ? ArrowUp : sortDir === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <div className="relative overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-end justify-between gap-3 p-5">
        <div>
          <span className="text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute">{t("avizReminders.eyebrow")}</span>
          <h2 className="mt-0.5 text-[20px] font-bold text-veltol-fg">{t("avizReminders.title")}</h2>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label={t("avizReminders.statusFilterLabel")} htmlFor="aviz-reminders-status">
            <FilterDropdown
              id="aviz-reminders-status"
              value={status}
              onChange={handleStatusChange}
              allLabel={t("avizReminders.statusAll")}
              options={[
                { value: "overdue", label: t("avizReminders.state.overdue") },
                { value: "dueSoon", label: t("avizReminders.state.dueSoon") },
                { value: "notDue", label: t("avizReminders.state.notDue") },
              ]}
            />
          </FilterField>
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
          <Button variant="outline" size="sm" title={t("avizReminders.sortByExpiry")} onClick={cycleSortDir} className="gap-1.5">
            <SortIcon className="size-3.5" />
            {t("avizReminders.sortByExpiry")}
          </Button>
        </div>
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
                <Badge variant={BADGE_VARIANT[reminder.state]}>{t("avizReminders.expiresOn", { date: reminder.expiresAt })}</Badge>
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
