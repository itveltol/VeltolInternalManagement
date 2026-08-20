"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Plus } from "lucide-react";
import {
  getExecutionData,
  upsertExecutionData,
  upsertStructureConfigRow,
  deleteStructureConfigRow,
} from "@/app/[locale]/(app)/projects/[id]/actions";
import { computeStructureTotals, computeLaborCost } from "@/features/projects/executionData/services/executionDataService";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { ProjectExecutionData, ProjectStructureConfigRow } from "@/features/projects/executionData/types";

interface Props {
  projectId: number;
  executionData: ProjectExecutionData | null;
  structureConfig: ProjectStructureConfigRow[];
  canMutate: boolean;
  teamMemberCount: number | null;
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="text-[11px] font-medium text-veltol-fgMute">{label}</div>
      <div className="mt-1 font-mono text-[13px] tabular-nums text-veltol-fg">{children}</div>
    </div>
  );
}

function TextCard({
  label, value, name, canMutate, formId, revision,
}: { label: string; value: string | null; name: string; canMutate: boolean; formId: string; revision?: string }) {
  if (!canMutate) {
    return <InfoCard label={label}>{value || "—"}</InfoCard>;
  }
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <label htmlFor={`${formId}-${name}`} className="text-[11px] font-medium text-veltol-fgMute">
        {label}
      </label>
      <Input
        key={revision}
        id={`${formId}-${name}`}
        form={formId}
        name={name}
        defaultValue={value ?? ""}
        className="mt-1 h-7 border-0 bg-transparent p-0 font-mono text-[13px] focus-visible:ring-0"
      />
    </div>
  );
}

function NumCard({
  label, value, name, canMutate, formId, suffix, revision, max, title,
}: { label: string; value: number | null; name: string; canMutate: boolean; formId: string; suffix?: string; revision?: string; max?: number; title?: string }) {
  if (!canMutate) {
    return <InfoCard label={label}>{value ?? "—"}{suffix && value != null ? ` ${suffix}` : ""}</InfoCard>;
  }
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <label htmlFor={`${formId}-${name}`} className="text-[11px] font-medium text-veltol-fgMute">
        {label}
      </label>
      <Input
        key={revision}
        id={`${formId}-${name}`}
        form={formId}
        type="number"
        min="0"
        max={max}
        title={title}
        name={name}
        defaultValue={value ?? ""}
        className="mt-1 h-7 border-0 bg-transparent p-0 text-right font-mono text-[13px] tabular-nums focus-visible:ring-0"
      />
    </div>
  );
}

const STRUCTURE_NUM_FIELDS = ["mesa_count", "picior_per_mesa", "stalp_per_mesa", "grinzi_per_mesa", "pane_per_mesa"] as const;

function StructureConfigRow({
  row, canMutate, onSave, onDelete,
}: {
  row: ProjectStructureConfigRow;
  canMutate: boolean;
  onSave: (row: ProjectStructureConfigRow) => void;
  onDelete: (row: ProjectStructureConfigRow) => void;
}) {
  // Truly uncontrolled: each field's initial value is captured once (via the
  // lazy useState initializer) and its draft is kept in a ref, never state,
  // so `defaultValue` never changes for the lifetime of the mounted Input —
  // neither from typing nor from the parent re-rendering with a fresh `row`
  // prop after a save. Base UI warns if an uncontrolled field's defaultValue
  // changes post-init, and this component intentionally never remounts
  // across a save (the parent keys it on a stable `clientKey`, not `row.id`),
  // so `row` here must only ever seed the initial value, never drive it.
  const [initialRow] = useState(row);
  const draftRef = useRef(row);

  function fieldChange(field: keyof ProjectStructureConfigRow, value: string) {
    draftRef.current = { ...draftRef.current, [field]: field === "structure_type" ? value : value === "" ? null : Number(value) };
  }

  function handleBlur() {
    onSave(draftRef.current);
  }

  return (
    <tr>
      <td className="px-3 py-2">
        {canMutate ? (
          <Input
            defaultValue={initialRow.structure_type}
            onChange={(e) => fieldChange("structure_type", e.target.value)}
            onBlur={handleBlur}
            className="h-7"
          />
        ) : row.structure_type}
      </td>
      {STRUCTURE_NUM_FIELDS.map((field) => (
        <td key={field} className="px-3 py-2">
          {canMutate ? (
            <Input
              type="number"
              min="0"
              defaultValue={initialRow[field] ?? ""}
              onChange={(e) => fieldChange(field, e.target.value)}
              onBlur={handleBlur}
              className="h-7 text-right font-mono tabular-nums"
            />
          ) : (
            <span className="block text-right font-mono tabular-nums">{row[field] ?? "—"}</span>
          )}
        </td>
      ))}
      {canMutate && (
        <td className="px-3 py-2 text-center">
          <button
            type="button"
            onClick={() => onDelete(row)}
            className="rounded p-1 text-veltol-fgMute transition-colors hover:bg-veltol-surface/50 hover:text-veltol-red"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </td>
      )}
    </tr>
  );
}

let nextClientKey = 0;

interface StructureRowEntry {
  clientKey: number;
  data: ProjectStructureConfigRow;
}

export function ProjectExecutionDataPanel({ projectId, executionData: initialExecutionData, structureConfig, canMutate, teamMemberCount }: Props) {
  const t = useTranslations("checklist.executionData");
  const tChecklist = useTranslations("checklist");
  const noTeam = !teamMemberCount || teamMemberCount <= 0;
  const [, startTransition] = useTransition();
  const [executionData, setExecutionData] = useState(initialExecutionData);
  // Each row carries a `clientKey` assigned once, at creation, and never
  // touched again — including across a new row's id changing from a
  // negative placeholder to the real DB id after its first save. Keying
  // StructureConfigRow on `data.id` instead would remount it right as that
  // id swap happens, destroying whatever the user was mid-typing into
  // fields they hadn't blurred yet (uncontrolled inputs lose unblurred
  // keystrokes on remount).
  const [rows, setRows] = useState<StructureRowEntry[]>(() => structureConfig.map((data) => ({ clientKey: nextClientKey++, data })));
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  // Serializes concurrent blur-saves for the same row (keyed by its original,
  // pre-save local id) so a new row's fields don't each insert a separate DB
  // row while the id from the first save hasn't landed in state yet.
  const rowSaveQueue = useRef<Map<number, Promise<void>>>(new Map());
  const savedRowIds = useRef<Map<number, number>>(new Map());

  const totals = computeStructureTotals(rows.map((r) => r.data));
  const laborCost = computeLaborCost(
    executionData?.buget_alocat_eur ?? null,
    executionData?.zile_deadline ?? null,
    executionData?.zile_reale ?? null,
  );

  const formId = `execution-data-${projectId}`;

  function handleInfoSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await upsertExecutionData(null, formData);
      if (result?.success) {
        const fresh = await getExecutionData(projectId);
        setExecutionData(fresh);
      }
      setSaveMsg(result?.success ? t("saved") : t("saveError"));
      setTimeout(() => setSaveMsg(null), 2000);
    });
  }

  function handleAddRow() {
    setRows((prev) => [
      ...prev,
      {
        clientKey: nextClientKey++,
        data: {
          id: -(prev.length + 1),
          project_id: projectId,
          structure_type: "",
          mesa_count: 0,
          picior_per_mesa: null,
          stalp_per_mesa: null,
          grinzi_per_mesa: null,
          pane_per_mesa: null,
          sort_order: prev.length,
          created_at: "",
          updated_at: "",
        },
      },
    ]);
  }

  function handleRowSave(row: ProjectStructureConfigRow) {
    if (!row.structure_type || !row.mesa_count) return;
    const localId = row.id;
    const previousSave = (rowSaveQueue.current.get(localId) ?? Promise.resolve()).catch(() => {});
    const thisSave = previousSave.then(async () => {
      const knownId = localId > 0 ? localId : savedRowIds.current.get(localId);
      const fd = new FormData();
      fd.set("project_id", String(projectId));
      if (knownId != null) fd.set("id", String(knownId));
      fd.set("structure_type", row.structure_type);
      fd.set("mesa_count", String(row.mesa_count));
      fd.set("picior_per_mesa", row.picior_per_mesa != null ? String(row.picior_per_mesa) : "");
      fd.set("stalp_per_mesa", row.stalp_per_mesa != null ? String(row.stalp_per_mesa) : "");
      fd.set("grinzi_per_mesa", row.grinzi_per_mesa != null ? String(row.grinzi_per_mesa) : "");
      fd.set("pane_per_mesa", row.pane_per_mesa != null ? String(row.pane_per_mesa) : "");
      fd.set("sort_order", String(row.sort_order));
      const result = await upsertStructureConfigRow(null, fd);
      if (result?.success && result.id != null) {
        const savedId = result.id;
        savedRowIds.current.set(localId, savedId);
        setRows((prev) => prev.map((r) => (r.data.id === localId || r.data.id === savedId ? { ...r, data: { ...row, id: savedId } } : r)));
      }
    });
    rowSaveQueue.current.set(localId, thisSave);
    startTransition(async () => {
      await thisSave;
    });
  }

  function handleDeleteRow(row: ProjectStructureConfigRow) {
    setRows((prev) => prev.filter((r) => r.data.id !== row.id));
    if (row.id <= 0) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("project_id", String(projectId));
      fd.set("id", String(row.id));
      await deleteStructureConfigRow(null, fd);
    });
  }

  return (
    <div className="space-y-4 rounded-card border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-veltol-fg">{t("title")}</h2>
        {saveMsg && <span className="font-mono text-[11px] text-veltol-fgMute">{saveMsg}</span>}
      </div>

      <form id={formId} action={handleInfoSubmit} className="contents">
        <input type="hidden" name="project_id" value={projectId} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <TextCard label={t("siteResponsible")} value={executionData?.site_responsible ?? null} name="site_responsible" canMutate={canMutate} formId={formId} revision={executionData?.updated_at} />
          <TextCard label={t("dirigintesantier")} value={executionData?.diriginte_santier ?? null} name="diriginte_santier" canMutate={canMutate} formId={formId} revision={executionData?.updated_at} />
          <TextCard label={t("rte")} value={executionData?.rte ?? null} name="rte" canMutate={canMutate} formId={formId} revision={executionData?.updated_at} />
          <NumCard label={t("zileDeadline")} value={executionData?.zile_deadline ?? null} name="zile_deadline" canMutate={canMutate} formId={formId} revision={executionData?.updated_at} />
          <NumCard label={t("zileReale")} value={executionData?.zile_reale ?? null} name="zile_reale" canMutate={canMutate} formId={formId} revision={executionData?.updated_at} />
          <NumCard
            label={t("numarPersoane")}
            value={executionData?.numar_persoane_alocate ?? null}
            name="numar_persoane_alocate"
            canMutate={canMutate}
            formId={formId}
            revision={executionData?.updated_at}
            max={teamMemberCount ?? undefined}
            title={noTeam ? tChecklist("noTeamAssigned") : undefined}
          />
          <NumCard label={t("bugetAlocat")} value={executionData?.buget_alocat_eur ?? null} name="buget_alocat_eur" canMutate={canMutate} formId={formId} suffix="EUR" revision={executionData?.updated_at} />
          <InfoCard label={t("costTotalManopera")}>
            {laborCost != null ? `${Math.round(laborCost).toLocaleString()} EUR` : "—"}
          </InfoCard>
        </div>
      
        <div className="pt-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-veltol-fgDim">{t("structureConfig")}</h3>
            {canMutate && (
              <Button type="button" variant="outline" onClick={handleAddRow}>
                <Plus data-icon="inline-start" />
                {t("addStructureRow")}
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-veltol-surface/40">
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-veltol-fgMute">{t("structureType")}</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-veltol-fgMute">{t("mesaCount")}</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-veltol-fgMute">{t("piciorPerMesa")}</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-veltol-fgMute">{t("stalpPerMesa")}</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-veltol-fgMute">{t("grinziPerMesa")}</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-veltol-fgMute">{t("panePerMesa")}</th>
                  {canMutate && <th className="w-10 px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ clientKey, data }) => (
                  <StructureConfigRow
                    key={clientKey}
                    row={data}
                    canMutate={canMutate}
                    onSave={handleRowSave}
                    onDelete={handleDeleteRow}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-veltol-surface/40 font-semibold">
                  <td className="px-3 py-2 text-[11px] text-veltol-fgMute">{t("total")}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{totals.picior}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{totals.stalp}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{totals.grinzi}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{totals.pane}</td>
                  {canMutate && <td className="px-3 py-2" />}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
         {canMutate && (
          <Button type="submit" variant="outline" className="mt-3">
            {t("save")}
          </Button>
        )}
      </form>
    </div>
  );
}
