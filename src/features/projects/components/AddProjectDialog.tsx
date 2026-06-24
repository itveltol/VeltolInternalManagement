"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { createProject } from "@/app/[locale]/(app)/projects/actions";
import { PROJECT_PHASES, PROJECT_STATUSES, PROJECT_PRIORITIES } from "../types";
import type { ProjectManager } from "../types";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-white/10 bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-aqua/50 focus:ring-2 focus:ring-veltol-aqua/20";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-white/10 bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-aqua/50 focus:ring-2 focus:ring-veltol-aqua/20 resize-none";

interface Props {
  open: boolean;
  managers: ProjectManager[];
  onClose: () => void;
}

export function AddProjectDialog({ open, managers, onClose }: Props) {
  const t = useTranslations("projects");
  const tPhase = useTranslations("projectPhase");
  const tStatus = useTranslations("projectStatus");
  const tPriority = useTranslations("projectPriority");

  const [state, action, pending] = useActionState(createProject, null);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-white/[0.08] bg-veltol-deep p-8 shadow-2xl">
          <Dialog.Title className="font-display text-xl font-semibold text-veltol-fg">
            {t("addProject")}
          </Dialog.Title>

          <form action={action} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.name")} *</Label>
              <Input name="name" required placeholder="CEF Bellamy Energ SRL" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.county")}</Label>
                <Input name="county" placeholder="Mureș" />
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.siteLocation")}</Label>
                <Input name="site_location" placeholder="—" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.mwSolar")}</Label>
                <Input name="mw_solar" type="number" step="0.001" min="0" placeholder="5.8" />
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.mwBess")}</Label>
                <Input name="mw_bess" type="number" step="0.001" min="0" placeholder="5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.projectType")}</Label>
                <Input name="project_type" placeholder="CEF cu BESS" />
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.manager")}</Label>
                <select name="manager_id" className={SELECT_CLASS}>
                  <option value="" className="bg-veltol-deep">—</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id} className="bg-veltol-deep">
                      {[m.first_name, m.last_name].filter(Boolean).join(" ") || m.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.phase")}</Label>
                <select name="current_phase" defaultValue="proposal" className={SELECT_CLASS}>
                  {PROJECT_PHASES.map((p) => (
                    <option key={p} value={p} className="bg-veltol-deep">{tPhase(p)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.progress")}</Label>
                <Input name="progress_pct" type="number" min="0" max="100" defaultValue="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.contractNumber")}</Label>
                <Input name="contract_number" placeholder="627" />
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.contractDate")}</Label>
                <input name="contract_date" type="date" className={SELECT_CLASS} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.deadline")}</Label>
                <input name="deadline" type="date" className={SELECT_CLASS} />
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.valueEur")}</Label>
                <Input name="value_eur" type="number" min="0" placeholder="2195000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.status")}</Label>
                <select name="status" defaultValue="on_schedule" className={SELECT_CLASS}>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-veltol-deep">{tStatus(s)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.priority")}</Label>
                <select name="priority" defaultValue="medium" className={SELECT_CLASS}>
                  {PROJECT_PRIORITIES.map((p) => (
                    <option key={p} value={p} className="bg-veltol-deep">{tPriority(p)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" name="cu_issued" value="true" className="h-4 w-4 rounded border border-white/20 bg-veltol-surface accent-veltol-aqua" />
                <span className="font-mono text-[11px] text-veltol-fgDim">{t("fields.cuIssued")}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" name="atr_issued" value="true" className="h-4 w-4 rounded border border-white/20 bg-veltol-surface accent-veltol-aqua" />
                <span className="font-mono text-[11px] text-veltol-fgDim">{t("fields.atrIssued")}</span>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.notes")}</Label>
              <textarea name="notes" rows={3} className={TEXTAREA_CLASS} />
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
