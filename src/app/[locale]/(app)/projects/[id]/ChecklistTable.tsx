"use client";

import React, { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { upsertChecklistItem, logTodayRealizat, getDailyLog } from "./actions";
import { computeSectionSummaries } from "@/lib/checklist-template";
import type { ChecklistRow, ChecklistPhase, DailyLogRecord } from "@/lib/types/checklist";

interface Props {
  rows: ChecklistRow[];
  projectId: number;
  canMutate: boolean;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface RowState {
  plan_total: string;
  zile: string;
  todayValue: string;
  status: SaveStatus;
  todayStatus: SaveStatus;
  historyOpen: boolean;
  historyRecords: DailyLogRecord[] | null;
  historyLoading: boolean;
}

function pctColor(pct: number): string {
  if (pct >= 100) return "text-veltol-green";
  if (pct >= 60) return "text-veltol-aqua";
  if (pct >= 30) return "text-veltol-amber";
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
  "h-7 w-20 rounded-md border bg-transparent px-2 text-right font-mono tabular-nums text-[12px] text-veltol-fg outline-none transition-colors focus:border-veltol-aqua/50 focus:ring-2 focus:ring-veltol-aqua/20 disabled:opacity-50";

function NumInput({
  value,
  onChange,
  onBlur,
  dirty,
  disabled,
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
      className={[
        INPUT_BASE,
        dirty ? "border-veltol-amber/50" : "border-white/10",
      ].join(" ")}
    />
  );
}

export function ChecklistTable({ rows, projectId, canMutate }: Props) {
  const t = useTranslations("checklist");
  const locale = useLocale();
  const [, startTransition] = useTransition();

  const [localState, setLocalState] = useState<Record<number, RowState>>(() => {
    const init: Record<number, RowState> = {};
    for (const row of rows) {
      if (!row.isSection) {
        init[row.number] = {
          plan_total: row.plan_total != null ? String(row.plan_total) : "",
          zile:       row.zile       != null ? String(row.zile)       : "",
          todayValue: "",
          status: "idle",
          todayStatus: "idle",
          historyOpen: false,
          historyRecords: null,
          historyLoading: false,
        };
      }
    }
    return init;
  });

  const [dirtySet, setDirtySet] = useState<Set<number>>(new Set());

  // Close all history popovers on outside click
  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setLocalState((prev) => {
          const next = { ...prev };
          for (const k in next) {
            if (next[k].historyOpen) next[k] = { ...next[k], historyOpen: false };
          }
          return next;
        });
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const updateField = useCallback(
    (itemNumber: number, field: keyof Pick<RowState, "plan_total" | "zile">, value: string) => {
      setLocalState((prev) => ({
        ...prev,
        [itemNumber]: { ...prev[itemNumber], [field]: value },
      }));
      setDirtySet((prev) => new Set(prev).add(itemNumber));
    },
    [],
  );

  const handleBlur = useCallback(
    (itemNumber: number, row: ChecklistRow) => {
      if (!dirtySet.has(itemNumber)) return;
      setLocalState((prev) => ({
        ...prev,
        [itemNumber]: { ...prev[itemNumber], status: "saving" },
      }));
      setDirtySet((prev) => {
        const next = new Set(prev);
        next.delete(itemNumber);
        return next;
      });
      startTransition(async () => {
        const state = localState[itemNumber];
        const fd = new FormData();
        fd.set("project_id", String(projectId));
        fd.set("item_number", String(itemNumber));
        fd.set("plan_total", state?.plan_total ?? "");
        fd.set("zile",       state?.zile       ?? "");
        const result = await upsertChecklistItem(null, fd);
        const status: SaveStatus = result?.error ? "error" : "saved";
        setLocalState((prev) => ({
          ...prev,
          [itemNumber]: { ...prev[itemNumber], status },
        }));
        if (status === "saved") {
          setTimeout(() => {
            setLocalState((prev) => ({
              ...prev,
              [itemNumber]: { ...prev[itemNumber], status: "idle" },
            }));
          }, 2000);
        }
      });
    },
    [dirtySet, localState, projectId],
  );

  const handleTodayChange = useCallback((itemNumber: number, value: string) => {
    setLocalState((prev) => ({
      ...prev,
      [itemNumber]: { ...prev[itemNumber], todayValue: value },
    }));
  }, []);

  const handleTodayBlur = useCallback(
    (itemNumber: number, row: ChecklistRow) => {
      const val = localState[itemNumber]?.todayValue;
      if (!val || val === "") return;
      if (!row.record?.id) return; // item must exist in DB first

      setLocalState((prev) => ({
        ...prev,
        [itemNumber]: { ...prev[itemNumber], todayStatus: "saving" },
      }));
      startTransition(async () => {
        const fd = new FormData();
        fd.set("item_id",    String(row.record!.id));
        fd.set("project_id", String(projectId));
        fd.set("realizat",   val);
        const result = await logTodayRealizat(null, fd);
        const todayStatus: SaveStatus = result?.error ? "error" : "saved";
        setLocalState((prev) => ({
          ...prev,
          [itemNumber]: {
            ...prev[itemNumber],
            todayStatus,
            todayValue: todayStatus === "saved" ? "" : prev[itemNumber].todayValue,
          },
        }));
        if (todayStatus === "saved") {
          setTimeout(() => {
            setLocalState((prev) => ({
              ...prev,
              [itemNumber]: { ...prev[itemNumber], todayStatus: "idle" },
            }));
          }, 2000);
        }
      });
    },
    [localState, projectId],
  );

  const toggleHistory = useCallback(
    (itemNumber: number, row: ChecklistRow) => {
      const current = localState[itemNumber];
      if (!current) return;

      if (current.historyOpen) {
        setLocalState((prev) => ({
          ...prev,
          [itemNumber]: { ...prev[itemNumber], historyOpen: false },
        }));
        return;
      }

      // Open and load if needed
      setLocalState((prev) => ({
        ...prev,
        [itemNumber]: { ...prev[itemNumber], historyOpen: true, historyLoading: true, historyRecords: null },
      }));

      if (!row.record?.id) {
        setLocalState((prev) => ({
          ...prev,
          [itemNumber]: { ...prev[itemNumber], historyLoading: false, historyRecords: [] },
        }));
        return;
      }

      startTransition(async () => {
        const records = await getDailyLog(row.record!.id);
        setLocalState((prev) => ({
          ...prev,
          [itemNumber]: { ...prev[itemNumber], historyLoading: false, historyRecords: records },
        }));
      });
    },
    [localState],
  );

  // Compute live section pcts — plan_total may be edited locally, realizat is server-computed
  const liveRows: ChecklistRow[] = rows.map((r) => {
    if (r.isSection) return r;
    const state = localState[r.number];
    const planTotal = parseInt(state?.plan_total ?? "", 10);
    const realizat  = r.record?.realizat ?? null;
    const pct =
      !isNaN(planTotal) && planTotal > 0 && realizat != null
        ? Math.min(100, Math.max(0, (realizat / planTotal) * 100))
        : r.pct;
    return { ...r, pct };
  });

  const sections = computeSectionSummaries(liveRows);
  const sectionPctMap = new Map<ChecklistPhase, number>(
    sections.map((s) => [s.phase, s.avgPct]),
  );

  function formatDate(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString(
      locale === "hu" ? "hu-HU" : locale === "ro" ? "ro-RO" : "en-GB",
      { year: "numeric", month: "2-digit", day: "2-digit" },
    );
  }

  return (
    <div className="v-panel v-hairline overflow-hidden rounded-xl" ref={tableRef}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <span className="mono-label text-[10px] text-veltol-fgMute">
          {t("totalActivities", { count: rows.filter((r) => !r.isSection).length })}
        </span>
        {dirtySet.size > 0 && (
          <span className="font-mono text-[11px] text-veltol-amber">
            {t("unsavedChanges", { count: dirtySet.size })}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="w-12 px-4 py-3 text-left font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute">
                {t("columns.cod")}
              </th>
              <th className="w-8 px-2 py-3 text-left font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute">
                {t("columns.number")}
              </th>
              <th className="px-3 py-3 text-left font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute">
                {t("columns.activitate")}
              </th>
              <th className="w-24 px-3 py-3 text-right font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute">
                {t("columns.plan_total")}
              </th>
              <th className="w-20 px-3 py-3 text-right font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute">
                {t("columns.zile")}
              </th>
              <th className="w-24 px-3 py-3 text-right font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute">
                {t("columns.target_zi")}
              </th>
              <th className="w-28 px-3 py-3 text-right font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute">
                {t("columns.realizat")}
              </th>
              {canMutate && (
                <th className="w-28 px-3 py-3 text-right font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute">
                  {t("columns.today")}
                </th>
              )}
              <th className="w-16 px-3 py-3 text-right font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute">
                {t("columns.pct")}
              </th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {rows.map((row) => {
              if (row.isSection) {
                const sectionPct = sectionPctMap.get(row.phase) ?? 0;
                const colSpan = canMutate ? 10 : 9;
                return (
                  <tr
                    key={`section-${row.number}`}
                    className="border-t border-white/[0.06] bg-veltol-surface/40"
                  >
                    <td colSpan={colSpan} className="relative overflow-hidden px-4 py-2.5">
                      <div
                        className="absolute left-0 top-0 w-[3px] bg-gradient-to-b from-veltol-teal to-veltol-aqua transition-all duration-700"
                        style={{ height: `${sectionPct}%` }}
                      />
                      <div className="flex items-center gap-3 pl-3">
                        <span className="mono-label text-[9px] text-veltol-aqua">{row.cod}</span>
                        <span className="font-display text-[13px] font-semibold tracking-wide text-veltol-fg">
                          {row.activitate}
                        </span>
                        <span className="ml-auto font-mono tabular-nums text-[11px] text-veltol-fgMute">
                          {Math.round(sectionPct)}%
                        </span>
                        <div className="h-0.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-veltol-teal to-veltol-aqua transition-all duration-700"
                            style={{ width: `${sectionPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }

              const state = localState[row.number];
              const isDirty = dirtySet.has(row.number);

              // plan_total may be edited locally; realizat is server-computed from daily log sum
              const planTotal = parseInt(state?.plan_total ?? "", 10);
              const realizat  = row.record?.realizat ?? null;
              const livePct =
                !isNaN(planTotal) && planTotal > 0 && realizat != null
                  ? Math.min(100, Math.max(0, (realizat / planTotal) * 100))
                  : row.pct;

              return (
                <React.Fragment key={`frag-${row.number}`}>
                  <tr
                    className="group border-b border-white/[0.03] transition-colors hover:bg-veltol-surface/30"
                  >
                    {/* COD */}
                    <td className="pl-8 pr-2 py-2.5 font-mono tabular-nums text-[10px] text-veltol-fgMute">
                      {row.cod}
                    </td>
                    {/* # */}
                    <td className="px-2 py-2.5 font-mono tabular-nums text-[10px] text-veltol-fgMute">
                      {row.number}
                    </td>
                    {/* Activity */}
                    <td className="max-w-[240px] px-3 py-2.5 text-[13px] text-veltol-fg">
                      {row.activitate}
                    </td>

                    {/* Plan total */}
                    <td className="px-3 py-2">
                      {canMutate ? (
                        <div className="flex justify-end">
                          <NumInput
                            value={state?.plan_total ?? ""}
                            onChange={(v) => updateField(row.number, "plan_total", v)}
                            onBlur={() => handleBlur(row.number, row)}
                            dirty={isDirty}
                            disabled={state?.status === "saving"}
                          />
                        </div>
                      ) : (
                        <span className="block text-right font-mono tabular-nums text-[12px] text-veltol-fgDim">
                          {row.plan_total ?? "—"}
                        </span>
                      )}
                    </td>

                    {/* Days */}
                    <td className="px-3 py-2">
                      {canMutate ? (
                        <div className="flex justify-end">
                          <NumInput
                            value={state?.zile ?? ""}
                            onChange={(v) => updateField(row.number, "zile", v)}
                            onBlur={() => handleBlur(row.number, row)}
                            dirty={isDirty}
                            disabled={state?.status === "saving"}
                          />
                        </div>
                      ) : (
                        <span className="block text-right font-mono tabular-nums text-[12px] text-veltol-fgDim">
                          {row.zile ?? "—"}
                        </span>
                      )}
                    </td>

                    {/* Target/day — computed: plan_total / zile */}
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[12px] text-veltol-fgDim">
                      {(() => {
                        const pt = parseInt(state?.plan_total ?? "", 10);
                        const z  = parseInt(state?.zile       ?? "", 10);
                        if (!isNaN(pt) && !isNaN(z) && z > 0)
                          return Math.round(pt / z);
                        return row.target_zi ?? "—";
                      })()}
                    </td>

                    {/* Done (realizat) — read-only, computed as sum of daily log */}
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[12px] text-veltol-fgDim">
                      {row.record?.realizat ?? "—"}
                    </td>

                    {/* Today */}
                    {canMutate && (
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {state?.todayStatus === "saved" && (
                            <span className="text-[10px] text-veltol-green">✓</span>
                          )}
                          {state?.todayStatus === "error" && (
                            <span className="text-[10px] text-veltol-red">✗</span>
                          )}
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={state?.todayValue ?? ""}
                            onChange={(e) => handleTodayChange(row.number, e.target.value)}
                            onBlur={() => handleTodayBlur(row.number, row)}
                            placeholder="0"
                            disabled={state?.todayStatus === "saving" || !row.record?.id}
                            title={!row.record?.id ? "Save the row first" : undefined}
                            className={[
                              INPUT_BASE,
                              "border-white/10 placeholder:text-veltol-fgMute/40",
                              !row.record?.id ? "cursor-not-allowed opacity-30" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </div>
                      </td>
                    )}

                    {/* % */}
                    <td className="px-3 py-2.5 text-right">
                      <PctCell pct={livePct} />
                    </td>

                    {/* History button */}
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleHistory(row.number, row)}
                        title={t("history.title")}
                        className="rounded p-1 text-veltol-fgMute transition-colors hover:bg-white/[0.06] hover:text-veltol-fgDim"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </button>
                    </td>
                  </tr>

                  {/* History popover row */}
                  {state?.historyOpen && (
                    <tr className="bg-veltol-surface/20">
                      <td colSpan={canMutate ? 10 : 9} className="px-8 py-3">
                        <div className="inline-block min-w-[260px] rounded-lg border border-white/[0.08] bg-veltol-bg p-3 shadow-xl">
                          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute">
                            {t("history.title")} — {row.activitate}
                          </div>
                          {state.historyLoading ? (
                            <p className="py-2 text-center font-mono text-[11px] text-veltol-fgMute">
                              {t("history.loading")}
                            </p>
                          ) : state.historyRecords && state.historyRecords.length > 0 ? (
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-white/[0.06]">
                                  <th className="pb-1.5 text-left font-mono text-[9px] uppercase tracking-[0.14em] text-veltol-fgMute">
                                    {t("history.colDate")}
                                  </th>
                                  <th className="pb-1.5 text-right font-mono text-[9px] uppercase tracking-[0.14em] text-veltol-fgMute">
                                    {t("history.colDone")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.04]">
                                {state.historyRecords.map((rec) => (
                                  <tr key={rec.id}>
                                    <td className="py-1.5 font-mono text-[11px] text-veltol-fgDim">
                                      {formatDate(rec.log_date)}
                                    </td>
                                    <td className="py-1.5 text-right font-mono tabular-nums text-[12px] text-veltol-fg">
                                      {rec.realizat}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="py-2 text-center font-mono text-[11px] text-veltol-fgMute">
                              {t("history.empty")}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
