"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { createSituationAction } from "@/app/[locale]/(app)/situations/actions";
import { SituationProjectCombobox } from "./SituationProjectCombobox";
import type { Project } from "@/features/projects/types";

interface Props {
  projects: Project[];
  open: boolean;
  onClose: () => void;
}

export function CreateSituationDialog({ projects, open, onClose }: Props) {
  const t = useTranslations("situations");
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [state, action, pending] = useActionState(createSituationAction, null);

  useEffect(() => {
    if (!open) {
      setProject(null);
      setName("");
    }
  }, [open]);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("addSituation")}
          </Dialog.Title>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="project_id" value={project?.id ?? ""} />

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.project")} *</Label>
              <SituationProjectCombobox projects={projects} value={project} onValueChange={setProject} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.name")} *</Label>
              <Input name="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {state?.error && (
              <p className="text-sm text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
              <Button type="submit" disabled={pending || !project}>{pending ? t("saving") : t("save")}</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
