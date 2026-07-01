"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, FolderOpen, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { scanProjectFolder, applyFolderScanSuggestions } from "@/app/[locale]/(app)/projects/actions";
import { getActivities } from "@/app/[locale]/(app)/matrice-status/actions";
import { CHECKLIST_TEMPLATE } from "@/features/projects/checklists/services/checklistTemplate";
import { STATUS_COLOR } from "@/features/matrice/types";
import type { FolderItem } from "@/core/microsoft/folderProvider";
import type { Activity } from "@/features/matrice/types";

interface Props {
  projectId: number;
  folderLinked: boolean;
  onClose: () => void;
}

type Stage = "idle" | "scanning" | "analyzed" | "reviewing" | "applying" | "done";

interface ChecklistProposal {
  itemNumber: number;
  plan_total: number;
  label: string;
  accepted: boolean;
}

interface MatriceProposal {
  activityId: number;
  status: "finalizat" | "in_progres";
  label: string;
  phase: string;
  accepted: boolean;
}

const CHECKLIST_ITEMS = CHECKLIST_TEMPLATE.filter((r) => !r.isSection).map((r) => ({
  number: r.number,
  activitate: r.activitate,
  cod: r.cod,
}));

export function FolderScanStep({ projectId, folderLinked, onClose }: Props) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const [, startTransition] = useTransition();

  const [stage, setStage] = useState<Stage>("idle");
  const [files, setFiles] = useState<FolderItem[]>([]);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [checklistProposals, setChecklistProposals] = useState<ChecklistProposal[]>([]);
  const [matriceProposals, setMatriceProposals] = useState<MatriceProposal[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Load activities on mount
  useEffect(() => {
    startTransition(async () => {
      try {
        const acts = await getActivities();
        setActivities(acts);
      } catch {
        // Non-fatal — AI analysis will still work with empty activities
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScan() {
    setStage("scanning");
    setScanError(null);
    startTransition(async () => {
      const result = await scanProjectFolder(projectId);
      if (result.error || result.files.length === 0) {
        setScanError(result.error ?? "noFiles");
        setStage("idle");
        return;
      }
      setFiles(result.files);
      setSelectedNames(new Set(result.files.map((f) => f.name)));
      setStage("analyzed");
    });
  }

  async function handleAnalyze() {
    setAiError(null);
    const selected = files.filter((f) => selectedNames.has(f.name));
    const fileNames = selected.map((f) => f.path || f.name);

    const activityItems = activities
      .filter((a) => !a.is_section_header)
      .map((a) => ({ id: a.id, name: a.name, phase_name: a.phase_name }));

    try {
      const res = await fetch("/api/ai/folder-scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-veltol-ai": "1",
        },
        body: JSON.stringify({
          fileNames,
          checklistItems: CHECKLIST_ITEMS,
          activities: activityItems,
        }),
      });

      if (!res.ok) {
        setAiError(t("folderScan.analyzing"));
        return;
      }

      const data = (await res.json()) as {
        checklistSuggestions: Array<{ itemNumber: number; plan_total: number }>;
        matriceSuggestions: Array<{ activityId: number; status: "finalizat" | "in_progres" }>;
      };

      const clProposals: ChecklistProposal[] = data.checklistSuggestions.map((s) => {
        const item = CHECKLIST_TEMPLATE.find((r) => r.number === s.itemNumber);
        return {
          itemNumber: s.itemNumber,
          plan_total: s.plan_total,
          label: item ? `[${item.cod}] ${item.activitate}` : `#${s.itemNumber}`,
          accepted: true,
        };
      });

      const mProposals: MatriceProposal[] = data.matriceSuggestions.map((s) => {
        const act = activities.find((a) => a.id === s.activityId);
        return {
          activityId: s.activityId,
          status: s.status,
          label: act?.name ?? `#${s.activityId}`,
          phase: act?.phase_name ?? "",
          accepted: true,
        };
      });

      setChecklistProposals(clProposals);
      setMatriceProposals(mProposals);
      setStage("reviewing");
    } catch {
      setAiError(t("folderScan.applyError"));
    }
  }

  function toggleChecklist(idx: number) {
    setChecklistProposals((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, accepted: !p.accepted } : p)),
    );
  }

  function toggleMatrice(idx: number) {
    setMatriceProposals((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, accepted: !p.accepted } : p)),
    );
  }

  function handleApply() {
    const clUpdates = checklistProposals
      .filter((p) => p.accepted)
      .map((p) => ({ itemNumber: p.itemNumber, plan_total: p.plan_total }));
    const mUpdates = matriceProposals
      .filter((p) => p.accepted)
      .map((p) => ({ activityId: p.activityId, status: p.status }));

    setStage("applying");
    setApplyError(null);
    startTransition(async () => {
      const result = await applyFolderScanSuggestions(projectId, clUpdates, mUpdates);
      if (result?.error) {
        setApplyError(t("folderScan.applyError"));
        setStage("reviewing");
        return;
      }
      setStage("done");
    });
  }

  const acceptedCount =
    checklistProposals.filter((p) => p.accepted).length +
    matriceProposals.filter((p) => p.accepted).length;

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (stage === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-veltol-surface/60">
          <FolderOpen className="size-7 text-veltol-aqua" />
        </div>
        <div>
          <p className="font-display text-base font-semibold text-veltol-fg">
            {t("folderScan.stepTitle")}
          </p>
          <p className="mt-1 text-sm text-veltol-fgMute">{t("folderScan.stepSubtitle")}</p>
        </div>

        {!folderLinked && (
          <p className="rounded-lg border border-veltol-amber/30 bg-veltol-amber/10 px-4 py-2 text-sm text-veltol-amber">
            {t("folderScan.noFolder")}
          </p>
        )}

        {scanError && (
          <p className="text-sm text-veltol-red">
            {scanError === "noFiles" ? t("folderScan.noFiles") : t("folderScan.applyError")}
          </p>
        )}

        <div className="flex gap-3">
          <Button onClick={handleScan} disabled={!folderLinked}>
            {t("folderScan.scanButton")}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t("folderScan.skip")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Scanning ───────────────────────────────────────────────────────────────
  if (stage === "scanning") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="size-8 animate-spin text-veltol-aqua" />
        <p className="text-sm text-veltol-fgMute">{t("folderScan.scanning")}</p>
      </div>
    );
  }

  // ── Analyzed (file tree) ───────────────────────────────────────────────────
  if (stage === "analyzed") {
    const allSelected = selectedNames.size === files.length;

    function toggleAll() {
      if (allSelected) {
        setSelectedNames(new Set());
      } else {
        setSelectedNames(new Set(files.map((f) => f.name)));
      }
    }

    function toggleFile(name: string) {
      setSelectedNames((prev) => {
        const next = new Set(prev);
        next.has(name) ? next.delete(name) : next.add(name);
        return next;
      });
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-veltol-fg">
            {t("folderScan.filesSelected", { count: selectedNames.size })}
          </p>
          <button
            type="button"
            onClick={toggleAll}
            className="font-mono text-[11px] text-veltol-aqua hover:underline"
          >
            {allSelected ? t("folderScan.deselectAll") : t("folderScan.selectAll")}
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-veltol-surface/40">
          {files.map((f) => (
            <label
              key={f.path}
              className="flex cursor-pointer items-center gap-2.5 border-b border-white/[0.05] px-3 py-1.5 last:border-0 hover:bg-white/[0.03]"
            >
              <input
                type="checkbox"
                checked={selectedNames.has(f.name)}
                onChange={() => toggleFile(f.name)}
                className="h-3.5 w-3.5 rounded border border-white/20 bg-veltol-surface accent-veltol-aqua"
              />
              <span
                className={[
                  "font-mono text-[11px] truncate",
                  f.type === "folder" ? "text-veltol-amber" : "text-veltol-fg",
                ].join(" ")}
              >
                {f.path || f.name}
              </span>
            </label>
          ))}
        </div>

        {aiError && <p className="text-sm text-veltol-red">{aiError}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>
            {t("folderScan.skip")}
          </Button>
          <Button onClick={handleAnalyze} disabled={selectedNames.size === 0}>
            {t("folderScan.analyzeButton")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Analyzing spinner (brief, while fetch is in flight) ───────────────────
  // Handled inline via the fetch in handleAnalyze; stage stays "analyzed" until complete.

  // ── Reviewing ─────────────────────────────────────────────────────────────
  if (stage === "reviewing") {
    const hasAny = checklistProposals.length > 0 || matriceProposals.length > 0;

    return (
      <div className="flex flex-col gap-4">
        {!hasAny && (
          <p className="rounded-lg border border-white/10 bg-veltol-surface/40 px-4 py-3 text-sm text-veltol-fgMute">
            {t("folderScan.noSuggestions")}
          </p>
        )}

        {checklistProposals.length > 0 && (
          <section>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-veltol-fgMute">
              {t("folderScan.checklistTitle")}
            </p>
            <div className="rounded-lg border border-white/10 bg-veltol-surface/40">
              {checklistProposals.map((p, idx) => (
                <div
                  key={p.itemNumber}
                  className="flex items-center gap-3 border-b border-white/[0.05] px-3 py-1.5 last:border-0"
                >
                  <button
                    type="button"
                    onClick={() => toggleChecklist(idx)}
                    className="flex-shrink-0"
                    title={p.accepted ? t("folderScan.accepted") : t("folderScan.rejected")}
                  >
                    {p.accepted ? (
                      <CheckCircle2 className="size-4 text-veltol-green" />
                    ) : (
                      <XCircle className="size-4 text-veltol-fgMute/50" />
                    )}
                  </button>
                  <span className="flex-1 truncate font-mono text-[11px] text-veltol-fg">
                    {p.label}
                  </span>
                  <span className="font-mono text-[10px] text-veltol-fgMute">plan: 1</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {matriceProposals.length > 0 && (
          <section>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-veltol-fgMute">
              {t("folderScan.matriceTitle")}
            </p>
            <div className="rounded-lg border border-white/10 bg-veltol-surface/40">
              {matriceProposals.map((p, idx) => (
                <div
                  key={p.activityId}
                  className="flex items-center gap-3 border-b border-white/[0.05] px-3 py-1.5 last:border-0"
                >
                  <button
                    type="button"
                    onClick={() => toggleMatrice(idx)}
                    className="flex-shrink-0"
                    title={p.accepted ? t("folderScan.accepted") : t("folderScan.rejected")}
                  >
                    {p.accepted ? (
                      <CheckCircle2 className="size-4 text-veltol-green" />
                    ) : (
                      <XCircle className="size-4 text-veltol-fgMute/50" />
                    )}
                  </button>
                  <span className="flex-1 truncate font-mono text-[11px] text-veltol-fg">
                    {p.phase && (
                      <span className="text-veltol-fgMute">{p.phase} / </span>
                    )}
                    {p.label}
                  </span>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 font-mono text-[10px]",
                      STATUS_COLOR[p.status],
                    ].join(" ")}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {applyError && <p className="text-sm text-veltol-red">{applyError}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>
            {t("folderScan.discard")}
          </Button>
          {hasAny && (
            <Button onClick={handleApply} disabled={acceptedCount === 0}>
              {t("folderScan.applyButton", { count: acceptedCount })}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Applying ───────────────────────────────────────────────────────────────
  if (stage === "applying") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="size-8 animate-spin text-veltol-aqua" />
        <p className="text-sm text-veltol-fgMute">{t("folderScan.analyzing")}</p>
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <CheckCircle2 className="size-10 text-veltol-green" />
      <p className="text-sm text-veltol-fg">{t("folderScan.done")}</p>
      <Button onClick={onClose}>{t("cancel")}</Button>
    </div>
  );
}
