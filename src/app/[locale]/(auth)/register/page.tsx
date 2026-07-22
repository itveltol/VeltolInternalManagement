"use client";

import { useActionState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { completeRegistration } from "./actions";

export default function RegisterPage() {
  const t = useTranslations("register");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [state, action, pending] = useActionState(completeRegistration, null);

  useEffect(() => {
    if (state?.success) {
      router.push(`/${locale}/dashboard`);
      router.refresh();
    }
  }, [state?.success, router, locale]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-veltol-bg p-4">
      <div className="relative w-full max-w-sm rounded-card border border-border bg-card p-8 shadow-panel">
        <div className="mb-8 text-center">
          <span className="mono-label text-[11px] tracking-[0.14em] text-veltol-fgMute">
            {t("platform")}
          </span>
          <div className="mt-2">
            <span className="font-display text-2xl text-veltol-fg">Veltol</span>
            <span className="font-display text-2xl text-veltol-accent">.io</span>
          </div>
          <p className="mt-1 text-xs text-veltol-fgDim">{t("tagline")}</p>
        </div>

        <form action={action} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-veltol-fgMute">
                {t("firstNameLabel")}
              </Label>
              <Input name="first_name" required className="border-veltol-border bg-card text-veltol-fg placeholder:text-veltol-faint focus-visible:ring-veltol-accent/20" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-veltol-fgMute">
                {t("lastNameLabel")}
              </Label>
              <Input name="last_name" required className="border-veltol-border bg-card text-veltol-fg placeholder:text-veltol-faint focus-visible:ring-veltol-accent/20" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-veltol-fgMute">
              {t("phoneLabel")}
            </Label>
            <Input
              name="phone"
              placeholder="+36 30 000 0000"
              className="border-veltol-border bg-card text-veltol-fg placeholder:text-veltol-faint focus-visible:ring-veltol-accent/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-veltol-fgMute">
              {t("passwordLabel")}
            </Label>
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="border-veltol-border bg-card text-veltol-fg placeholder:text-veltol-faint focus-visible:ring-veltol-accent/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-veltol-fgMute">
              {t("confirmPasswordLabel")}
            </Label>
            <Input
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              required
              className="border-veltol-border bg-card text-veltol-fg placeholder:text-veltol-faint focus-visible:ring-veltol-accent/20"
            />
          </div>

          {state?.error && (
            <p className="text-[13px] text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? t("submitting") : t("submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
