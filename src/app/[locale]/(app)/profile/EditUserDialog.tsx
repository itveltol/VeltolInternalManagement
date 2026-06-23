"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateUser } from "./actions";
import type { Profile, AppRole } from "@/lib/types/profile";

const ROLES: AppRole[] = [
  "admin",
  "project_manager",
  "site_engineer",
  "finance",
  "viewer",
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
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/[0.08] bg-veltol-deep p-8 shadow-2xl">
          <Dialog.Title className="font-display text-xl font-semibold text-veltol-fg">
            {t("editTitle")}
          </Dialog.Title>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="userId" value={user.id} />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">
                  {t("firstName")}
                </Label>
                <Input
                  name="first_name"
                  defaultValue={user.first_name ?? ""}
                  placeholder={t("firstName")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">
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
              <Label className="mono-label text-[9px] text-veltol-fgMute">
                {t("phone")}
              </Label>
              <Input
                name="phone"
                defaultValue={user.phone ?? ""}
                placeholder="+36 30 000 0000"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="mono-label text-[9px] text-veltol-fgMute">
                {t("colRole")}
              </Label>
              <select
                name="role"
                defaultValue={user.role}
                className="h-8 w-full rounded-lg border border-white/10 bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-aqua/50 focus:ring-2 focus:ring-veltol-aqua/20"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="bg-veltol-deep">
                    {t(`role_${r}`)}
                  </option>
                ))}
              </select>
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
