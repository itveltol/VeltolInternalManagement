"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { updateProject, assignProjectTeam } from "@/app/[locale]/(app)/projects/actions";
import {
  PROJECT_PHASES,
  PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_TYPES,
  PROJECT_CATEGORIES,
  CONTRACT_TYPES,
  FINANCIAL_TYPES,
} from "../types";
import type { Project, ProjectManager, ProjectCategory } from "../types";
import type { ClientRef } from "@/features/clients/types";
import type { Team } from "@/features/teams/types";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 resize-none";

interface Props {
  project: Project;
  open: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  teams: Team[];
  canAssignTeam: boolean;
  onClose: () => void;
}

export function EditProjectDialog({ project, open, managers, clientRefs, teams, canAssignTeam, onClose }: Props) {
  const t = useTranslations("projects");
  const tPhase = useTranslations("projectPhase");
  const tStatus = useTranslations("projectStatus");
  const tPriority = useTranslations("projectPriority");
  const tType = useTranslations("projectType");
  const tCategory = useTranslations("projectCategory");
  const tContractType = useTranslations("contractType");
  const tFinancialType = useTranslations("financialType");

  const [state, action, pending] = useActionState(updateProject, null);
  const [category, setCategory] = useState<ProjectCategory>(project.project_category);
  const [progressManual, setProgressManual] = useState(project.progress_pct_manual);
  const [statusManual, setStatusManual] = useState(project.status_manual);

  const [teamId, setTeamId] = useState<number | null>(project.team_id);
  const [teamState, setTeamState] = useState<{ error?: string; success?: string } | null>(null);
  const [teamPending, startTeamTransition] = useTransition();

  function handleTeamChange(value: string) {
    const nextTeamId = value === "" ? null : Number(value);
    setTeamId(nextTeamId);
    startTeamTransition(async () => {
      const result = await assignProjectTeam(project.id, nextTeamId);
      setTeamState(result);
    });
  }

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("editProject")}
          </Dialog.Title>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="projectId" value={project.id} />

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.name")} *</Label>
              <Input name="name" required defaultValue={project.name} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.county")}</Label>
                <Input name="county" defaultValue={project.county ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.siteLocation")}</Label>
                <Input name="site_location" defaultValue={project.site_location ?? ""} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.mwSolar")}</Label>
                <Input name="mw_solar" type="number" step="0.001" min="0" defaultValue={project.mw_solar ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.mwBess")}</Label>
                <Input name="mw_bess" type="number" step="0.001" min="0" defaultValue={project.mw_bess ?? ""} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.projectCategory")}</Label>
                <select
                  name="project_category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                  className={SELECT_CLASS}
                >
                  {PROJECT_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-card">{tCategory(c)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.manager")}</Label>
                <select name="manager_id" defaultValue={project.manager_id ?? ""} className={SELECT_CLASS}>
                  <option value="" className="bg-card">—</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id} className="bg-card">
                      {[m.first_name, m.last_name].filter(Boolean).join(" ") || m.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {canAssignTeam && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.team")}</Label>
                <select
                  value={teamId ?? ""}
                  onChange={(e) => handleTeamChange(e.target.value)}
                  disabled={teamPending}
                  className={SELECT_CLASS}
                >
                  <option value="" className="bg-card">—</option>
                  {teams.map((tm) => (
                    <option key={tm.id} value={tm.id} className="bg-card">{tm.name}</option>
                  ))}
                </select>
                {teamState?.error && <p className="text-xs text-veltol-red">{t(teamState.error as Parameters<typeof t>[0])}</p>}
                {teamState?.success && <p className="text-xs text-veltol-green">{t(teamState.success as Parameters<typeof t>[0])}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.financialType")}</Label>
                <select name="financial_type" defaultValue={project.financial_type} className={SELECT_CLASS}>
                  {FINANCIAL_TYPES.map((ft) => (
                    <option key={ft} value={ft} className="bg-card">{tFinancialType(ft)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.contractType")}</Label>
              <div className="flex gap-6">
                {CONTRACT_TYPES.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      name={`contract_type_${c}`}
                      value="true"
                      defaultChecked={project.contract_type.includes(c)}
                      className="h-4 w-4 rounded border border-border bg-veltol-surface accent-veltol-accent"
                    />
                    <span className="font-mono text-[11px] text-veltol-fgDim">{tContractType(c)}</span>
                  </label>
                ))}
              </div>
            </div>

            {category === "industrial" && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.projectType")}</Label>
                <select name="project_type" defaultValue={project.project_type ?? ""} className={SELECT_CLASS}>
                  <option value="" className="bg-card">—</option>
                  {PROJECT_TYPES.map((pt) => (
                    <option key={pt} value={pt} className="bg-card">{tType(pt)}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.client")}</Label>
              <select name="client_id" defaultValue={project.client_id ?? ""} className={SELECT_CLASS}>
                <option value="" className="bg-card">—</option>
                {clientRefs.map((c) => (
                  <option key={c.id} value={c.id} className="bg-card">{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.phase")}</Label>
                <select name="current_phase" defaultValue={project.current_phase} className={SELECT_CLASS}>
                  {PROJECT_PHASES.map((p) => (
                    <option key={p} value={p} className="bg-card">{tPhase(p)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.progress")}</Label>
                  <label className="flex cursor-pointer items-center gap-1.5" title={t("autoManual.autoHint")}>
                    <input
                      type="checkbox"
                      checked={progressManual}
                      onChange={(e) => setProgressManual(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border border-border bg-veltol-surface accent-veltol-accent"
                    />
                    <span className="font-mono text-[10px] text-veltol-fgDim">
                      {progressManual ? t("autoManual.manual") : t("autoManual.auto")}
                    </span>
                  </label>
                </div>
                <input type="hidden" name="progress_pct_manual" value={progressManual ? "true" : "false"} />
                <Input
                  name="progress_pct"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={project.progress_pct}
                  disabled={!progressManual}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.contractNumber")}</Label>
                <Input name="contract_number" defaultValue={project.contract_number ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.contractDate")}</Label>
                <input name="contract_date" type="date" defaultValue={project.contract_date ?? ""} className={SELECT_CLASS} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.deadline")}</Label>
                <input name="deadline" type="date" defaultValue={project.deadline ?? ""} className={SELECT_CLASS} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.valueEur")}</Label>
                <Input name="value_eur" type="number" min="0" defaultValue={project.value_eur ?? ""} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.status")}</Label>
                  <label className="flex cursor-pointer items-center gap-1.5" title={t("autoManual.autoHint")}>
                    <input
                      type="checkbox"
                      checked={statusManual}
                      onChange={(e) => setStatusManual(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border border-border bg-veltol-surface accent-veltol-accent"
                    />
                    <span className="font-mono text-[10px] text-veltol-fgDim">
                      {statusManual ? t("autoManual.manual") : t("autoManual.auto")}
                    </span>
                  </label>
                </div>
                <input type="hidden" name="status_manual" value={statusManual ? "true" : "false"} />
                <select name="status" defaultValue={project.status} className={SELECT_CLASS} disabled={!statusManual}>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-card">{tStatus(s)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.priority")}</Label>
                <select name="priority" defaultValue={project.priority} className={SELECT_CLASS}>
                  {PROJECT_PRIORITIES.map((p) => (
                    <option key={p} value={p} className="bg-card">{tPriority(p)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" name="cu_issued" value="true" defaultChecked={project.cu_issued} className="h-4 w-4 rounded border border-border bg-veltol-surface accent-veltol-accent" />
                <span className="font-mono text-[11px] text-veltol-fgDim">{t("fields.cuIssued")}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" name="atr_issued" value="true" defaultChecked={project.atr_issued} className="h-4 w-4 rounded border border-border bg-veltol-surface accent-veltol-accent" />
                <span className="font-mono text-[11px] text-veltol-fgDim">{t("fields.atrIssued")}</span>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.notes")}</Label>
              <textarea name="notes" rows={3} defaultValue={project.notes ?? ""} className={TEXTAREA_CLASS} />
            </div>

            {state?.error && <p className="text-sm text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>}
            {state?.success && <p className="text-sm text-veltol-green">{t(state.success as Parameters<typeof t>[0])}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
              <Button type="submit" disabled={pending}>{pending ? t("saving") : t("save")}</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
