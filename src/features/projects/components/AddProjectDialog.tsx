"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { AiFillButton } from "@/shared/components/ui/ai-fill-button";
import { useAiFormFill } from "@/shared/hooks/useAiFormFill";
import { createProject } from "@/app/[locale]/(app)/projects/actions";
import { PROJECT_PHASES, PROJECT_STATUSES, PROJECT_PRIORITIES, PROJECT_TYPES } from "../types";
import type { ProjectManager } from "../types";
import type { ClientRef } from "@/features/clients/types";
import { FolderScanStep } from "./FolderScanStep";
import { cn } from "@/shared/utils/cn";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-white/10 bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-aqua/50 focus:ring-2 focus:ring-veltol-aqua/20";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-white/10 bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-aqua/50 focus:ring-2 focus:ring-veltol-aqua/20 resize-none";

interface ProjectFields {
  name: string;
  county: string;
  site_location: string;
  project_type: string;
  contract_number: string;
  mw_solar: string;
  mw_bess: string;
  notes: string;
}

const EMPTY: ProjectFields = {
  name: "",
  county: "",
  site_location: "",
  project_type: "",
  contract_number: "",
  mw_solar: "",
  mw_bess: "",
  notes: "",
};

const AI_TARGET_FIELDS: (keyof ProjectFields)[] = [
  "name",
  "county",
  "site_location",
  "project_type",
  "contract_number",
  "mw_solar",
  "mw_bess",
  "notes",
];

interface Props {
  open: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  onClose: () => void;
}

export function AddProjectDialog({ open, managers, clientRefs, onClose }: Props) {
  const t = useTranslations("projects");
  const tPhase = useTranslations("projectPhase");
  const tStatus = useTranslations("projectStatus");
  const tPriority = useTranslations("projectPriority");
  const tType = useTranslations("projectType");

  const [state, action, pending] = useActionState(createProject, null);
  const [step, setStep] = useState<"form" | "scan">("form");
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);
  const [folderLinked, setFolderLinked] = useState(false);

  const [fields, setFields] = useState<ProjectFields>(EMPTY);
  const [snapshot, setSnapshot] = useState<ProjectFields | null>(null);

  const getContext = useCallback(() => ({ name: fields.name }), [fields.name]);

  const { fillWithAi, loading, hasSuggestions, reset } = useAiFormFill({
    formType: "project",
    getContext,
    targetFields: AI_TARGET_FIELDS,
  });

  useEffect(() => {
    if (state?.success && state.projectId) {
      setCreatedProjectId(state.projectId);
      setFolderLinked(state.folderCreated !== false);
      setStep("scan");
    }
  }, [state?.success, state?.projectId]);

  useEffect(() => {
    if (!open) {
      setFields(EMPTY);
      setSnapshot(null);
      setStep("form");
      setCreatedProjectId(null);
      reset();
    }
  }, [open]);

  const setField = useCallback(
    (key: keyof ProjectFields) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFields((f) => ({ ...f, [key]: e.target.value })),
    [],
  );

  const handleFill = async () => {
    setSnapshot({ ...fields });
    const suggestions = await fillWithAi();
    if (Object.keys(suggestions).length > 0) {
      setFields((f) => ({ ...f, ...(suggestions as Partial<ProjectFields>) }));
    }
  };

  const handleFileSelect = async (file: File) => {
    setSnapshot({ ...fields });
    const suggestions = await fillWithAi(file);
    if (Object.keys(suggestions).length > 0) {
      setFields((f) => ({ ...f, ...(suggestions as Partial<ProjectFields>) }));
    }
  };

  const handleUndo = () => {
    if (snapshot) {
      setFields(snapshot);
      setSnapshot(null);
      reset();
    }
  };

  const aiClass = (key: keyof ProjectFields) =>
    cn(hasSuggestions && fields[key] ? "ring-1 ring-veltol-aqua/30" : "");

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-white/[0.08] bg-veltol-deep p-5 shadow-2xl sm:p-8">
          {step === "scan" && createdProjectId !== null ? (
            <>
              <Dialog.Title className="font-display text-xl font-semibold text-veltol-fg">
                {t("folderScan.stepTitle")}
              </Dialog.Title>
              <div className="mt-6">
                <FolderScanStep
                  projectId={createdProjectId}
                  folderLinked={folderLinked}
                  onClose={onClose}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Dialog.Title className="font-display text-xl font-semibold text-veltol-fg">
                  {t("addProject")}
                </Dialog.Title>
                <AiFillButton
                  onFill={handleFill}
                  onFileSelect={handleFileSelect}
                  onUndo={handleUndo}
                  loading={loading}
                  hasSuggestions={hasSuggestions}
                />
              </div>

              <form action={action} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.name")} *</Label>
                  <Input
                    name="name"
                    required
                    placeholder="CEF Bellamy Energ SRL"
                    value={fields.name}
                    onChange={setField("name")}
                    className={aiClass("name")}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.county")}</Label>
                    <Input
                      name="county"
                      placeholder="Mureș"
                      value={fields.county}
                      onChange={setField("county")}
                      className={aiClass("county")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.siteLocation")}</Label>
                    <Input
                      name="site_location"
                      placeholder="—"
                      value={fields.site_location}
                      onChange={setField("site_location")}
                      className={aiClass("site_location")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.mwSolar")}</Label>
                    <Input
                      name="mw_solar"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="5.8"
                      value={fields.mw_solar}
                      onChange={setField("mw_solar")}
                      className={aiClass("mw_solar")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.mwBess")}</Label>
                    <Input
                      name="mw_bess"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="5"
                      value={fields.mw_bess}
                      onChange={setField("mw_bess")}
                      className={aiClass("mw_bess")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.projectType")}</Label>
                    <select
                      name="project_type"
                      value={fields.project_type}
                      onChange={(e) => setFields((f) => ({ ...f, project_type: e.target.value }))}
                      className={cn(SELECT_CLASS, aiClass("project_type"))}
                    >
                      <option value="" className="bg-veltol-deep">—</option>
                      {PROJECT_TYPES.map((pt) => (
                        <option key={pt} value={pt} className="bg-veltol-deep">{tType(pt)}</option>
                      ))}
                    </select>
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

                <div className="space-y-1.5">
                  <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.client")}</Label>
                  <select name="client_id" className={SELECT_CLASS}>
                    <option value="" className="bg-veltol-deep">—</option>
                    {clientRefs.map((c) => (
                      <option key={c.id} value={c.id} className="bg-veltol-deep">{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.contractNumber")}</Label>
                    <Input
                      name="contract_number"
                      placeholder="627"
                      value={fields.contract_number}
                      onChange={setField("contract_number")}
                      className={aiClass("contract_number")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.contractDate")}</Label>
                    <input name="contract_date" type="date" className={SELECT_CLASS} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.deadline")}</Label>
                    <input name="deadline" type="date" className={SELECT_CLASS} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.valueEur")}</Label>
                    <Input name="value_eur" type="number" min="0" placeholder="2195000" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <textarea
                    name="notes"
                    rows={3}
                    className={cn(TEXTAREA_CLASS, aiClass("notes"))}
                    value={fields.notes}
                    onChange={setField("notes")}
                  />
                </div>

                {state?.error && <p className="text-sm text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>}
                {state?.success && state.folderCreated === false && (
                  <p className="text-sm text-veltol-amber">{t("folderFailed")}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
                  <Button type="submit" disabled={pending}>{pending ? t("saving") : t("save")}</Button>
                </div>
              </form>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
