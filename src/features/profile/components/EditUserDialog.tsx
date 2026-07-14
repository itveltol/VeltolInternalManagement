"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { updateUser } from "@/app/[locale]/(app)/profile/actions";
import type { Profile, AppRole } from "../types";

const ROLES: AppRole[] = [
  "admin",
  "project_manager",
  "site_engineer",
  "finance",
  "viewer",
  "outfield_worker",
];

interface Props {
  user: Profile;
  open: boolean;
  onClose: () => void;
}

export function EditUserDialog({ user, open, onClose }: Props) {
  const t = useTranslations("profile");
  const [state, action, pending] = useActionState(updateUser, null);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("editTitle")}
          </Dialog.Title>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="userId" value={user.id} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">
                  {t("firstName")}
                </Label>
                <Input
                  name="first_name"
                  defaultValue={user.first_name ?? ""}
                  placeholder={t("firstName")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">
                  {t("lastName")}
                </Label>
                <Input
                  name="last_name"
                  defaultValue={user.last_name ?? ""}
                  placeholder={t("lastName")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">
                {t("phone")}
              </Label>
              <Input
                name="phone"
                defaultValue={user.phone ?? ""}
                placeholder="+36 30 000 0000"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">
                {t("colRole")}
              </Label>
              <select
                name="role"
                defaultValue={user.role}
                className="h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="bg-card">
                    {t(`role_${r}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">
                {t("medicalExamExpiry")}
              </Label>
              <input
                name="medical_exam_expires_at"
                type="date"
                defaultValue={user.medical_exam_expires_at ?? ""}
                className="h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-veltol-red">
                {t(state.error as Parameters<typeof t>[0])}
              </p>
            )}
            {state?.success && (
              <p className="text-sm text-veltol-green">
                {t(state.success as Parameters<typeof t>[0])}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close
                render={
                  <Button type="button" variant="outline">
                    {t("cancel")}
                  </Button>
                }
              />
              <Button type="submit" disabled={pending}>
                {pending ? t("saving") : t("save")}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
