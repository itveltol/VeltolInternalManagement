"use client";

import React, { memo, useTransition, useCallback, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Paperclip } from "lucide-react";
import { upsertChecklistItem, logTodayRealizat, getDailyLog, getLinkedDocuments } from "@/app/[locale]/(app)/projects/[id]/actions";
import { computeSectionSummaries } from "@/features/projects/checklists/services/checklistTemplate";
import { useChecklistStore } from "../hooks/useChecklistStore";
import { DocumentList } from "@/features/documents/components/DocumentList";
import { AddDocumentDialog } from "@/features/documents/components/AddDocumentDialog";
import type { ChecklistRow, ChecklistPhase } from "@/features/projects/checklists/types";

interface Props {
  rows: ChecklistRow[];
  projectId: number;
  canMutate: boolean;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function pctColor(pct: number): string {
  if (pct >= 100) return "text-veltol-green";
  if (pct >= 60) return "text-veltol-accent";
  if (pct >= 30) return "text-veltol-orange";
  return "text-veltol-fgMute";
}

function PctCell({ pct }: { pct: number | null }) {
  if (pct === null)
    return <span className="font-mono tabular-nums text-[11px] text-veltol-fgMute">—</span>;
  return (
    <span className={`font-mono tabular-nums text-[12px] ${pctColor(pct)}`}>
      {Math.round(pct)}%
    </span>
  );
}

const INPUT_BASE =
  "h-7 w-20 rounded-md border bg-transparent px-2 text-right font-mono tabular-nums text-[12px] text-veltol-fg outline-none transition-colors focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 disabled:opacity-50";

function NumInput({
  value, onChange, onBlur, dirty, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  dirty: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      min="0"
      step="1"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      className={[INPUT_BASE, dirty ? "border-veltol-orange/50" : "border-border"].join(" ")}
    />
  );
}

export function ChecklistTable({ rows, projectId, canMutate }: Props) {
  const t = useTranslations("checklist");
  const locale = useLocale();
  const [, startTransition] = useTransition();

  const {
    rowState, dirtySet,
    initRows, updateField, markDirty,
    updateTodayValue,
    closeAllHistory,
  } = useChecklistStore();

  // Init store on mount
  useEffect(() => {
    initRows(rows);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close all history popovers on outside click
  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        closeAllHistory();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [closeAllHistory]);

  const handleFieldChange = useCallback((itemNumber: number, field: "plan_total" | "zile", value: string) => {
    updateField(itemNumber, field, value);
    markDirty(itemNumber);
  }, [updateField, markDirty]);

  // These callbacks read live store state via getState() rather than closing
  // over `rowState`/`dirtySet`, so their identity stays stable across
  // keystrokes — required for React.memo on ChecklistDataRow to actually skip
  // re-rendering unaffected rows.
  const handleBlur = useCallback((itemNumber: number) => {
    const s = useChecklistStore.getState();
    if (!s.dirtySet.has(itemNumber)) return;
    s.setRowStatus(itemNumber, "saving");
    s.clearDirty(itemNumber);
    startTransition(async () => {
      const state = useChecklistStore.getState().rowState[itemNumber];
      const fd = new FormData();
      fd.set("project_id", String(projectId));
      fd.set("item_number", String(itemNumber));
      fd.set("plan_total", state?.plan_total ?? "");
      fd.set("zile", state?.zile ?? "");
      const result = await upsertChecklistItem(null, fd);
      const status: SaveStatus = result?.error ? "error" : "saved";
      useChecklistStore.getState().setRowStatus(itemNumber, status);
      if (status === "saved") {
        setTimeout(() => useChecklistStore.getState().setRowStatus(itemNumber, "idle"), 2000);
      }
    });
  }, [projectId]);

  const handleTodayBlur = useCallback((itemNumber: number, row: ChecklistRow) => {
    const s = useChecklistStore.getState();
    const val = s.rowState[itemNumber]?.todayValue;
    if (!val || val === "") return;
    if (!row.record?.id) return;

    s.setTodayStatus(itemNumber, "saving");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("item_id", String(row.record!.id));
      fd.set("project_id", String(projectId));
      fd.set("realizat", val);
      const result = await logTodayRealizat(null, fd);
      const todayStatus: SaveStatus = result?.error ? "error" : "saved";
      const s2 = useChecklistStore.getState();
      s2.setTodayStatus(itemNumber, todayStatus);
      if (todayStatus === "saved") {
        s2.updateTodayValue(itemNumber, "");
        setTimeout(() => useChecklistStore.getState().setTodayStatus(itemNumber, "idle"), 2000);
      }
    });
  }, [projectId]);

  const toggleDocs = useCallback((itemNumber: number, row: ChecklistRow) => {
    const s = useChecklistStore.getState();
    const current = s.rowState[itemNumber];
    if (!current) return;

    if (current.docsOpen) {
      s.toggleDocsOpen(itemNumber, false);
      return;
    }

    s.toggleDocsOpen(itemNumber, true);

    if (!row.record?.id) {
      s.setDocsRecords(itemNumber, []);
      return;
    }

    s.setDocsLoading(itemNumber, true);
    startTransition(async () => {
      const docs = await getLinkedDocuments("checklist_item", String(row.record!.id));
      useChecklistStore.getState().setDocsRecords(itemNumber, docs);
    });
  }, []);

  const toggleHistory = useCallback((itemNumber: number, row: ChecklistRow) => {
    const s = useChecklistStore.getState();
    const current = s.rowState[itemNumber];
    if (!current) return;

    if (current.historyOpen) {
      s.toggleHistoryOpen(itemNumber, false);
      return;
    }

    s.toggleHistoryOpen(itemNumber, true);
    s.setHistoryLoading(itemNumber, true);

    if (!row.record?.id) {
      s.setHistoryRecords(itemNumber, []);
      return;
    }

    startTransition(async () => {
      const records = await getDailyLog(row.record!.id);
      useChecklistStore.getState().setHistoryRecords(itemNumber, records);
    });
  }, []);

  // Compute live section pcts
  const liveRows: ChecklistRow[] = rows.map((r) => {
    if (r.isSection) return r;
    const state = rowState[r.number];
    const planTotal = parseInt(state?.plan_total ?? "", 10);
    const realizat = r.record?.realizat ?? null;
    const pct =
      !isNaN(planTotal) && planTotal > 0 && realizat != null
        ? Math.min(100, Math.max(0, (realizat / planTotal) * 100))
        : r.pct;
    return { ...r, pct };
  });

  const sections = computeSectionSummaries(liveRows);
  const sectionPctMap = new Map<ChecklistPhase, number>(sections.map((s) => [s.phase, s.avgPct]));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card" ref={tableRef}>
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-xs font-medium text-veltol-fgMute">
          {t("totalActivities", { count: rows.filter((r) => !r.isSection).length })}
        </span>
        {dirtySet.size > 0 && (
          <span className="font-mono text-[11px] text-veltol-orange">
            {t("unsavedChanges", { count: dirtySet.size })}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border">
              <th className="w-12 px-4 py-3 text-left text-[11px] font-medium text-veltol-fgMute">{t("columns.cod")}</th>
              <th className="w-8 px-2 py-3 text-left text-[11px] font-medium text-veltol-fgMute">{t("columns.number")}</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-veltol-fgMute">{t("columns.activitate")}</th>
              <th className="w-24 px-3 py-3 text-right text-[11px] font-medium text-veltol-fgMute">{t("columns.plan_total")}</th>
              <th className="w-20 px-3 py-3 text-right text-[11px] font-medium text-veltol-fgMute">{t("columns.zile")}</th>
              <th className="w-24 px-3 py-3 text-right text-[11px] font-medium text-veltol-fgMute">{t("columns.target_zi")}</th>
              <th className="w-28 px-3 py-3 text-right text-[11px] font-medium text-veltol-fgMute">{t("columns.realizat")}</th>
              {canMutate && <th className="w-28 px-3 py-3 text-right text-[11px] font-medium text-veltol-fgMute">{t("columns.today")}</th>}
              <th className="w-16 px-3 py-3 text-right text-[11px] font-medium text-veltol-fgMute">{t("columns.pct")}</th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              if (row.isSection) {
                const sectionPct = sectionPctMap.get(row.phase as ChecklistPhase) ?? 0;
                const colSpan = canMutate ? 10 : 9;
                return (
                  <tr key={row.rowKey} className="border-t border-border bg-veltol-surface/40">
                    <td colSpan={colSpan} className="relative overflow-hidden px-4 py-2.5">
                      <div
                        className="absolute left-0 top-0 w-[3px] bg-veltol-accent transition-all duration-700"
                        style={{ height: `${sectionPct}%` }}
                      />
                      <div className="flex items-center gap-3 pl-3">
                        <span className="font-mono text-[10px] text-veltol-accent">{row.cod}</span>
                        <span className="text-[13px] font-semibold tracking-wide text-veltol-fg">{row.activitate}</span>
                        <span className="ml-auto font-mono tabular-nums text-[11px] text-veltol-fgMute">{Math.round(sectionPct)}%</span>
                        <div className="h-0.5 w-16 overflow-hidden rounded-full bg-veltol-surface">
                          <div
                            className="h-full rounded-full bg-veltol-accent transition-all duration-700"
                            style={{ width: `${sectionPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <ChecklistDataRow
                  key={row.rowKey}
                  row={row}
                  projectId={projectId}
                  canMutate={canMutate}
                  locale={locale}
                  onFieldChange={handleFieldChange}
                  onBlur={handleBlur}
                  onTodayValueChange={updateTodayValue}
                  onTodayBlur={handleTodayBlur}
                  onToggleHistory={toggleHistory}
                  onToggleDocs={toggleDocs}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      <AddDocumentDialog />
    </div>
  );
}

interface ChecklistDataRowProps {
  row: ChecklistRow;
  projectId: number;
  canMutate: boolean;
  locale: string;
  onFieldChange: (itemNumber: number, field: "plan_total" | "zile", value: string) => void;
  onBlur: (itemNumber: number) => void;
  onTodayValueChange: (itemNumber: number, value: string) => void;
  onTodayBlur: (itemNumber: number, row: ChecklistRow) => void;
  onToggleHistory: (itemNumber: number, row: ChecklistRow) => void;
  onToggleDocs: (itemNumber: number, row: ChecklistRow) => void;
}

const ChecklistDataRow = memo(function ChecklistDataRow({
  row, projectId, canMutate, locale,
  onFieldChange, onBlur, onTodayValueChange, onTodayBlur, onToggleHistory, onToggleDocs,
}: ChecklistDataRowProps) {
  const t = useTranslations("checklist");
  const tDocs = useTranslations("documents");

  // Narrow subscriptions: this row only re-renders when its own slice changes.
  const state = useChecklistStore((s) => s.rowState[row.number]);
  const isDirty = useChecklistStore((s) => s.dirtySet.has(row.number));

  const planTotal = parseInt(state?.plan_total ?? "", 10);
  const realizat = row.record?.realizat ?? null;
  const livePct =
    !isNaN(planTotal) && planTotal > 0 && realizat != null
      ? Math.min(100, Math.max(0, (realizat / planTotal) * 100))
      : row.pct;

  function formatDate(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString(
      locale === "hu" ? "hu-HU" : locale === "ro" ? "ro-RO" : "en-GB",
      { year: "numeric", month: "2-digit", day: "2-digit" },
    );
  }

  return (
    <React.Fragment>
      <tr className="group border-b border-border transition-colors hover:bg-veltol-surface/50">
        <td className="pl-8 pr-2 py-2.5 font-mono tabular-nums text-[10px] text-veltol-fgMute">{row.cod}</td>
        <td className="px-2 py-2.5 font-mono tabular-nums text-[10px] text-veltol-fgMute">{row.number}</td>
        <td className="max-w-[240px] px-3 py-2.5 text-[13px] text-veltol-fg">{row.activitate}</td>

        <td className="px-3 py-2">
          {canMutate ? (
            <div className="flex justify-end">
              <NumInput
                value={state?.plan_total ?? ""}
                onChange={(v) => onFieldChange(row.number, "plan_total", v)}
                onBlur={() => onBlur(row.number)}
                dirty={isDirty}
                disabled={state?.status === "saving"}
              />
            </div>
          ) : (
            <span className="block text-right font-mono tabular-nums text-[12px] text-veltol-fgDim">{row.plan_total ?? "—"}</span>
          )}
        </td>

        <td className="px-3 py-2">
          {canMutate ? (
            <div className="flex justify-end">
              <NumInput
                value={state?.zile ?? ""}
                onChange={(v) => onFieldChange(row.number, "zile", v)}
                onBlur={() => onBlur(row.number)}
                dirty={isDirty}
                disabled={state?.status === "saving"}
              />
            </div>
          ) : (
            <span className="block text-right font-mono tabular-nums text-[12px] text-veltol-fgDim">{row.zile ?? "—"}</span>
          )}
        </td>

        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[12px] text-veltol-fgDim">
          {(() => {
            const pt = parseInt(state?.plan_total ?? "", 10);
            const z = parseInt(state?.zile ?? "", 10);
            if (!isNaN(pt) && !isNaN(z) && z > 0) return Math.round(pt / z);
            return row.target_zi ?? "—";
          })()}
        </td>

        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[12px] text-veltol-fgDim">{row.record?.realizat ?? "—"}</td>

        {canMutate && (
          <td className="px-3 py-2">
            <div className="flex items-center justify-end gap-1.5">
              {state?.todayStatus === "saved" && <span className="text-[10px] text-veltol-green">✓</span>}
              {state?.todayStatus === "error" && <span className="text-[10px] text-veltol-red">✗</span>}
              <input
                type="number"
                min="0"
                step="1"
                value={state?.todayValue ?? ""}
                onChange={(e) => onTodayValueChange(row.number, e.target.value)}
                onBlur={() => onTodayBlur(row.number, row)}
                placeholder="0"
                disabled={state?.todayStatus === "saving" || !row.record?.id}
                title={!row.record?.id ? "Save the row first" : undefined}
                className={[
                  INPUT_BASE,
                  "border-border placeholder:text-veltol-fgMute/40",
                  !row.record?.id ? "cursor-not-allowed opacity-30" : "",
                ].filter(Boolean).join(" ")}
              />
            </div>
          </td>
        )}

        <td className="px-3 py-2.5 text-right"><PctCell pct={livePct} /></td>

        <td className="px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-0.5">
            <button
              type="button"
              onClick={() => onToggleHistory(row.number, row)}
              title={t("history.title")}
              disabled={state?.historyLoading}
              className="rounded p-1 text-veltol-fgMute transition-colors hover:bg-veltol-surface/50 hover:text-veltol-fgDim disabled:cursor-default"
            >
              {state?.historyLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => onToggleDocs(row.number, row)}
              title={tDocs("attachDocuments")}
              disabled={state?.docsLoading}
              className={[
                "rounded p-1 transition-colors hover:bg-veltol-surface/50 disabled:cursor-default",
                state?.docsOpen ? "text-veltol-accent" : "text-veltol-fgMute hover:text-veltol-fgDim",
              ].join(" ")}
            >
              {state?.docsLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Paperclip className="h-3 w-3" />
              )}
            </button>
          </div>
        </td>
      </tr>

      {state?.docsOpen && (
        <tr className="bg-veltol-surface/20">
          <td colSpan={canMutate ? 10 : 9} className="px-8 py-3">
            <div className="inline-block min-w-[320px] rounded-lg border border-border bg-veltol-bg p-4 shadow-xl">
              <div className="mb-3 text-[11px] font-medium text-veltol-fgMute">
                {tDocs("attachDocuments")} — {row.activitate}
              </div>
              {state.docsLoading ? (
                <p className="font-mono text-[11px] text-veltol-fgMute">{tDocs("loadingDocuments")}</p>
              ) : (
                <DocumentList
                  documents={state.docsRecords ?? []}
                  linkedType="checklist_item"
                  linkedId={row.record?.id ? String(row.record.id) : ""}
                  projectId={projectId}
                  contextLabel={row.activitate}
                  canMutate={canMutate && !!row.record?.id}
                  compact
                />
              )}
            </div>
          </td>
        </tr>
      )}

      {state?.historyOpen && (
        <tr className="bg-veltol-surface/20">
          <td colSpan={canMutate ? 10 : 9} className="px-8 py-3">
            <div className="inline-block min-w-[260px] rounded-lg border border-border bg-veltol-bg p-3 shadow-xl">
              <div className="mb-2 text-[11px] font-medium text-veltol-fgMute">
                {t("history.title")} — {row.activitate}
              </div>
              {state.historyLoading ? (
                <p className="py-2 text-center font-mono text-[11px] text-veltol-fgMute">{t("history.loading")}</p>
              ) : state.historyRecords && state.historyRecords.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-1.5 text-left font-mono text-[9px] uppercase tracking-[0.14em] text-veltol-fgMute">{t("history.colDate")}</th>
                      <th className="pb-1.5 text-right font-mono text-[9px] uppercase tracking-[0.14em] text-veltol-fgMute">{t("history.colDone")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {state.historyRecords.map((rec) => (
                      <tr key={rec.id}>
                        <td className="py-1.5 font-mono text-[11px] text-veltol-fgDim">{formatDate(rec.log_date)}</td>
                        <td className="py-1.5 text-right font-mono tabular-nums text-[12px] text-veltol-fg">{rec.realizat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="py-2 text-center font-mono text-[11px] text-veltol-fgMute">{t("history.empty")}</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});
