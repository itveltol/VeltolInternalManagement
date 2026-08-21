"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { ProjectPicker } from "./ProjectPicker";
import {
  createScheduleEntryAction,
  updateScheduleEntryAction,
  deleteScheduleEntryAction,
} from "@/app/[locale]/(app)/schedule/actions";
import type { ScheduleEntry, ScheduleEntryProject } from "../types";

const SWATCHES = [
  null, "#2F6BED", "#16A34A", "#E0A312", "#DC2626", "#9333EA", "#0891B2",
];

interface Props {
  open: boolean;
  onClose: () => void;
  teamId: number;
  workDate: string;
  nextSortOrder: number;
  entry: ScheduleEntry | null;
  searchProjects: (query: string) => Promise<ScheduleEntryProject[]>;
}

export function ScheduleEntryDialog({
  open, onClose, teamId, workDate, nextSortOrder, entry, searchProjects,
}: Props) {
  const t = useTranslations("schedule");
  const [label, setLabel] = useState("");
  const [project, setProject] = useState<ScheduleEntryProject | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setLabel(entry?.label ?? "");
      setProject(entry?.project ?? null);
      setColor(entry?.color ?? null);
    }
  }, [open, entry]);

  function handleSave() {
    startTransition(async () => {
      const payload = { project_id: project?.id ?? null, label: label.trim(), color };
      const result = entry
        ? await updateScheduleEntryAction(entry.id, payload)
        : await createScheduleEntryAction(teamId, workDate, nextSortOrder, payload);
      if (result?.error) toast.error(t(result.error as "errorGeneric" | "errorNotAllowed"));
      else {
        if (result?.success) toast.success(t(result.success as "entrySaved"));
        onClose();
      }
    });
  }

  function handleDelete() {
    if (!entry) return;
    startTransition(async () => {
      const result = await deleteScheduleEntryAction(entry.id);
      if (result?.error) toast.error(t(result.error as "errorGeneric" | "errorNotAllowed"));
      else {
        if (result?.success) toast.success(t(result.success as "entryDeleted"));
        onClose();
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {entry ? t("entry.editTitle") : t("entry.addTitle")}
          </Dialog.Title>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("entry.label")}</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t("entry.labelPlaceholder")}
              />
            </div>

            <ProjectPicker value={project} onChange={setProject} searchProjects={searchProjects} />

            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-veltol-fgMute">{t("entry.color")}</span>
              <div className="flex flex-wrap gap-2">
                {SWATCHES.map((swatch) => (
                  <button
                    key={swatch ?? "none"}
                    type="button"
                    aria-label={swatch ?? t("entry.colorNone")}
                    onClick={() => setColor(swatch)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border"
                    style={{ backgroundColor: swatch ?? "transparent" }}
                  >
                    {color === swatch && (
                      <span className={`h-2 w-2 rounded-full ${swatch ? "bg-white" : "bg-veltol-fgMute"}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              {entry ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                  onClick={handleDelete}
                >
                  {isPending ? <Loader2 className="animate-spin" /> : <Trash2 data-icon="inline-start" />}
                  {t("entry.delete")}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-3">
                <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
                <Button type="button" disabled={isPending} onClick={handleSave}>
                  {isPending ? t("saving") : t("save")}
                </Button>
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
