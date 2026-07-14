"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { changePassword } from "@/app/[locale]/(app)/profile/actions";

export function PasswordForm() {
  const t = useTranslations("profile");
  const [state, action, pending] = useActionState(changePassword, null);

  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card px-8 py-8"
      style={{ background: "rgba(6, 10, 18, 0.6)" }}
    >
      <div className="mb-1 text-[11px] font-medium text-veltol-fgMute">
        {t("passwordTitle")}
      </div>
      <p className="mb-6 text-sm text-veltol-fgDim">{t("passwordDesc")}</p>

      <form action={action} className="max-w-sm space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-veltol-fgMute">
            {t("newPassword")}
          </Label>
          <Input
            name="new_password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-veltol-fgMute">
            {t("confirmPassword")}
          </Label>
          <Input
            name="confirm_password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
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

        <div className="pt-2">
          <Button type="submit" disabled={pending} className="min-w-[160px]">
            {pending ? t("changingPassword") : t("changePassword")}
          </Button>
        </div>
      </form>
    </div>
  );
}
