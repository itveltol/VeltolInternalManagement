"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { inviteUser } from "./actions";
import type { AppRole } from "@/lib/types/profile";

const ROLES: AppRole[] = [
  "admin",
  "project_manager",
  "site_engineer",
  "finance",
  "viewer",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InviteUserDialog({ open, onClose }: Props) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [state, action, pending] = useActionState(inviteUser, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onClose();
    }
  }, [state?.success, router, onClose]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/[0.08] bg-veltol-deep p-8 shadow-2xl">
          <Dialog.Title className="font-display text-xl font-semibold text-veltol-fg">
            {t("inviteTitle")}
          </Dialog.Title>
          <p className="mt-1 text-sm text-veltol-fgDim">{t("inviteDesc")}</p>

          <form action={action} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="mono-label text-[9px] text-veltol-fgMute">
                {t("inviteEmail")}
              </Label>
              <Input
                name="email"
                type="email"
                placeholder="name@veltol.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="mono-label text-[9px] text-veltol-fgMute">
                {t("initialRole")}
              </Label>
              <select
                name="role"
                defaultValue="viewer"
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

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close
                render={
                  <Button type="button" variant="outline">
                    {t("cancel")}
                  </Button>
                }
              />
              <Button type="submit" disabled={pending}>
                {pending ? t("sendingInvite") : t("sendInvite")}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
