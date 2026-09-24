"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { CalendarPlus, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import {
  DataCardList, DataCard, DataCardHeader, DataCardTitle,
  DataCardBadgeSlot, DataCardBody, DataCardField, DataCardFooter,
} from "@/shared/components/ui/data-card";
import { LogWorkerAbsenceDialog } from "@/features/teams/components/LogWorkerAbsenceDialog";
import { POLICY_START_YEAR } from "../services/vacationBalanceService";
import { balanceTotal } from "../types";
import type { VacationOverviewRow, VacationSubject } from "../types";
import type { Profile } from "@/features/profile/types";
import type { Holiday } from "@/features/holidays/types";
import { EditAllowanceDialog } from "./EditAllowanceDialog";
import { RequestVacationDialog } from "./RequestVacationDialog";

const INPUT_CLASS =
  "h-8 rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

type KindFilter = "all" | VacationSubject["kind"];

interface Props {
  rows: VacationOverviewRow[];
  year: number;
  currentUserId: string;
  employees: Profile[];
  holidays: Holiday[];
}

function subjectKey(subject: VacationSubject): string {
  return `${subject.kind}:${subject.id}`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function VacationOverviewTable({ rows, year, currentUserId, employees, holidays }: Props) {
  const t = useTranslations("vacation");
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  // Store keys, not rows, so dialogs pick up fresh data after revalidation.
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState<string | null>(null);

  const years = useMemo(() => {
    const last = Math.max(new Date().getFullYear() + 1, year);
    const first = Math.min(POLICY_START_YEAR, year);
    return Array.from({ length: last - first + 1 }, (_, i) => last - i);
  }, [year]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (kind === "all" || r.subject.kind === kind) &&
        (!q || r.name.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q)),
    );
  }, [rows, search, kind]);

  const editingRow = rows.find((r) => subjectKey(r.subject) === editingKey) ?? null;
  const requestRow = rows.find((r) => subjectKey(r.subject) === requestKey) ?? null;

  function handleYearChange(value: string) {
    router.push(`${pathname}?tab=overview&year=${value}`);
  }

  const columns = [
    t("columns.employee"),
    t("overviewColumns.base"),
    t("overviewColumns.carriedOver"),
    t("overviewColumns.adjustments"),
    t("overviewColumns.used"),
    t("overviewColumns.otherLeave"),
    t("overviewColumns.pending"),
    t("overviewColumns.remaining"),
    "",
  ];

  function remainingClass(row: VacationOverviewRow) {
    return row.balance.remainingDays < 0 ? "text-veltol-red" : "text-veltol-fg";
  }

  function renderActions(row: VacationOverviewRow, full = false) {
    const key = subjectKey(row.subject);
    return full ? (
      <>
        <Button variant="outline" className="flex-1" onClick={() => setEditingKey(key)}>
          <SlidersHorizontal data-icon="inline-start" /> {t("editAllowance")}
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setRequestKey(key)}>
          <CalendarPlus data-icon="inline-start" /> {t("newRequest")}
        </Button>
      </>
    ) : (
      <div className="flex items-center justify-end gap-1">
        <Button size="icon-sm" variant="outline" title={t("editAllowance")} onClick={() => setEditingKey(key)}>
          <SlidersHorizontal />
        </Button>
        <Button size="icon-sm" variant="ghost" title={t("newRequest")} onClick={() => setRequestKey(key)}>
          <CalendarPlus />
        </Button>
      </div>
    );
  }

  const numCell = "px-4 py-3.5 font-mono tabular-nums text-[12px] text-veltol-fgDim";

  return (
    <>
      <TableShell>
        <TableToolbar>
          <span className="text-xs font-medium text-veltol-fgMute">
            {t("overviewCount", { count: filtered.length })}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className={`${INPUT_CLASS} w-full sm:w-48`}
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as KindFilter)}
              className={INPUT_CLASS}
              aria-label={t("filterKind")}
            >
              <option value="all">{t("filterAll")}</option>
              <option value="user">{t("filterUsers")}</option>
              <option value="team_worker">{t("filterWorkers")}</option>
            </select>
            <select
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              className={`${INPUT_CLASS} font-mono`}
              aria-label={t("year")}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </TableToolbar>

        <TableDesktopView>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {columns.map((col, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("overviewEmpty")}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={subjectKey(row.subject)} className="transition-colors hover:bg-veltol-surface/50">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 text-veltol-fg">
                        {row.name}
                        {row.subject.kind === "team_worker" && (
                          <Badge variant="outline">{t("teamWorkerTag")}</Badge>
                        )}
                      </div>
                      {row.detail && <div className="text-[11px] text-veltol-fgMute">{row.detail}</div>}
                    </td>
                    <td className={numCell}>
                      {row.balance.baseDays}
                      {row.hasExplicitAllowance ? "" : "*"}
                    </td>
                    <td className={numCell}>+{row.balance.carriedOverDays}</td>
                    <td className={numCell}>{row.balance.adjustmentDays ? signed(row.balance.adjustmentDays) : "—"}</td>
                    <td className={numCell}>{row.balance.usedDays}</td>
                    <td className={numCell}>{row.balance.otherLeaveDays || "—"}</td>
                    <td className={numCell}>{row.pendingDays || "—"}</td>
                    <td className={`px-4 py-3.5 font-mono tabular-nums text-[13px] font-semibold ${remainingClass(row)}`}>
                      {row.balance.remainingDays}
                      <span className="font-normal text-veltol-fgMute"> / {balanceTotal(row.balance)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {renderActions(row)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="border-t border-border px-4 py-2.5 text-[11px] text-veltol-fgMute">{t("inheritedFootnote")}</p>
        </TableDesktopView>

        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("overviewEmpty")}</p>
        ) : (
          <DataCardList>
            {filtered.map((row) => (
              <DataCard key={subjectKey(row.subject)}>
                <DataCardHeader>
                  <DataCardTitle>{row.name}</DataCardTitle>
                  <DataCardBadgeSlot>
                    <span className={`font-mono text-sm font-semibold ${remainingClass(row)}`}>
                      {row.balance.remainingDays} / {balanceTotal(row.balance)}
                    </span>
                  </DataCardBadgeSlot>
                </DataCardHeader>
                <DataCardBody>
                  <DataCardField label={t("overviewColumns.base")}>
                    {row.balance.baseDays}
                    {row.hasExplicitAllowance ? "" : "*"}
                  </DataCardField>
                  <DataCardField label={t("overviewColumns.carriedOver")}>+{row.balance.carriedOverDays}</DataCardField>
                  <DataCardField label={t("overviewColumns.adjustments")}>
                    {row.balance.adjustmentDays ? signed(row.balance.adjustmentDays) : "—"}
                  </DataCardField>
                  <DataCardField label={t("overviewColumns.used")}>{row.balance.usedDays}</DataCardField>
                  <DataCardField label={t("overviewColumns.otherLeave")}>{row.balance.otherLeaveDays || "—"}</DataCardField>
                  <DataCardField label={t("overviewColumns.pending")}>{row.pendingDays || "—"}</DataCardField>
                </DataCardBody>
                <DataCardFooter className="flex-wrap">
                  {renderActions(row, true)}
                </DataCardFooter>
              </DataCard>
            ))}
          </DataCardList>
        )}
      </TableShell>

      {editingRow && (
        <EditAllowanceDialog
          key={subjectKey(editingRow.subject)}
          open
          row={editingRow}
          year={year}
          onClose={() => setEditingKey(null)}
        />
      )}

      {requestRow?.subject.kind === "user" && (
        <RequestVacationDialog
          key={requestRow.subject.id}
          open
          isAdmin
          currentUserId={currentUserId}
          employees={employees}
          defaultUserId={requestRow.subject.id}
          holidays={holidays}
          onClose={() => setRequestKey(null)}
        />
      )}

      {requestRow?.subject.kind === "team_worker" && (
        <LogWorkerAbsenceDialog
          key={requestRow.subject.id}
          open
          worker={{ id: requestRow.subject.id, first_name: requestRow.name, last_name: null }}
          onClose={() => setRequestKey(null)}
        />
      )}
    </>
  );
}
