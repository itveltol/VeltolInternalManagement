"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { updateProject } from "@/app/[locale]/(app)/projects/actions";
import { PROJECT_PHASES, PROJECT_STATUSES, PROJECT_PRIORITIES, PROJECT_TYPES, isHybridProjectType } from "../types";
import type { Project, ProjectManager } from "../types";
import type { ClientRef } from "@/features/clients/types";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-white/10 bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-aqua/50 focus:ring-2 focus:ring-veltol-aqua/20";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-white/10 bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-aqua/50 focus:ring-2 focus:ring-veltol-aqua/20 resize-none";

interface Props {
  project: Project;
  open: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  onClose: () => void;
}

export function EditProjectDialog({ project, open, managers, clientRefs, onClose }: Props) {
  const t = useTranslations("projects");
  const tPhase = useTranslations("projectPhase");
  const tStatus = useTranslations("projectStatus");
  const tPriority = useTranslations("projectPriority");
  const tType = useTranslations("projectType");

  const [state, action, pending] = useActionState(updateProject, null);

  const [projectType, setProjectType] = useState(project.project_type ?? "");
  const [valueEurSolar, setValueEurSolar] = useState(String(project.value_eur_solar ?? ""));
  const [valueEurBess, setValueEurBess] = useState(String(project.value_eur_bess ?? ""));
  const [valueEurManual, setValueEurManual] = useState(String(project.value_eur ?? ""));
  const hybrid = isHybridProjectType(projectType);
  const valueEurTotal = (Number(valueEurSolar) || 0) + (Number(valueEurBess) || 0);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-white/[0.08] bg-veltol-deep p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="font-display text-xl font-semibold text-veltol-fg">
            {t("editProject")}
          </Dialog.Title>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="projectId" value={project.id} />

            <div className="space-y-1.5">
              <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.name")} *</Label>
              <Input name="name" required defaultValue={project.name} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.county")}</Label>
                <Input name="county" defaultValue={project.county ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.siteLocation")}</Label>
                <Input name="site_location" defaultValue={project.site_location ?? ""} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.mwSolar")}</Label>
                <Input name="mw_solar" type="number" step="0.001" min="0" defaultValue={project.mw_solar ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.mwBess")}</Label>
                <Input name="mw_bess" type="number" step="0.001" min="0" defaultValue={project.mw_bess ?? ""} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.projectType")}</Label>
                <select
                  name="project_type"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="" className="bg-veltol-deep">—</option>
                  {PROJECT_TYPES.map((pt) => (
                    <option key={pt} value={pt} className="bg-veltol-deep">{tType(pt)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.manager")}</Label>
                <select name="manager_id" defaultValue={project.manager_id ?? ""} className={SELECT_CLASS}>
                  <option value="" className="bg-veltol-deep">—</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id} className="bg-veltol-deep">
                      {[m.first_name, m.last_name].filter(Boolean).join(" ") || m.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.client")}</Label>
              <select name="client_id" defaultValue={project.client_id ?? ""} className={SELECT_CLASS}>
                <option value="" className="bg-veltol-deep">—</option>
                {clientRefs.map((c) => (
                  <option key={c.id} value={c.id} className="bg-veltol-deep">{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.phase")}</Label>
                <select name="current_phase" defaultValue={project.current_phase} className={SELECT_CLASS}>
                  {PROJECT_PHASES.map((p) => (
                    <option key={p} value={p} className="bg-veltol-deep">{tPhase(p)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.progress")}</Label>
                <Input name="progress_pct" type="number" min="0" max="100" defaultValue={project.progress_pct} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.contractNumber")}</Label>
                <Input name="contract_number" defaultValue={project.contract_number ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.contractDate")}</Label>
                <input name="contract_date" type="date" defaultValue={project.contract_date ?? ""} className={SELECT_CLASS} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.deadline")}</Label>
                <input name="deadline" type="date" defaultValue={project.deadline ?? ""} className={SELECT_CLASS} />
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">
                  {hybrid ? t("fields.valueEurSolar") : t("fields.valueEur")}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={hybrid ? valueEurSolar : valueEurManual}
                  onChange={(e) =>
                    hybrid ? setValueEurSolar(e.target.value) : setValueEurManual(e.target.value)
                  }
                />
              </div>
            </div>

            <input type="hidden" name="value_eur" value={hybrid ? valueEurTotal : valueEurManual} />

            {hybrid && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.valueEurBess")}</Label>
                  <Input
                    name="value_eur_bess"
                    type="number"
                    min="0"
                    value={valueEurBess}
                    onChange={(e) => setValueEurBess(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.valueEurTotal")}</Label>
                  <p className="flex h-8 items-center font-mono text-sm text-veltol-fg">
                    {new Intl.NumberFormat("hu-HU").format(valueEurTotal)} €
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.status")}</Label>
                <select name="status" defaultValue={project.status} className={SELECT_CLASS}>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-veltol-deep">{tStatus(s)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.priority")}</Label>
                <select name="priority" defaultValue={project.priority} className={SELECT_CLASS}>
                  {PROJECT_PRIORITIES.map((p) => (
                    <option key={p} value={p} className="bg-veltol-deep">{tPriority(p)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" name="cu_issued" value="true" defaultChecked={project.cu_issued} className="h-4 w-4 rounded border border-white/20 bg-veltol-surface accent-veltol-aqua" />
                <span className="font-mono text-[11px] text-veltol-fgDim">{t("fields.cuIssued")}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" name="atr_issued" value="true" defaultChecked={project.atr_issued} className="h-4 w-4 rounded border border-white/20 bg-veltol-surface accent-veltol-aqua" />
                <span className="font-mono text-[11px] text-veltol-fgDim">{t("fields.atrIssued")}</span>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.notes")}</Label>
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
