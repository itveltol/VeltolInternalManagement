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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(120deg, #0B1E3E 0%, #163D64 20%, rgba(192,66,255,0.25) 45%, #1E8FA2 70%, #2BC4C8 100%)",
      }}
    >
      <div className="v-panel v-hairline relative w-full max-w-sm rounded-2xl p-8 shadow-[0_16px_40px_-10px_rgba(30,143,162,0.45)]">
        <div className="mb-8 text-center">
          <span className="mono-label text-[10px] text-veltol-fgMute">
            {t("platform")}
          </span>
          <div className="mt-2">
            <span className="font-brand text-2xl text-veltol-fg">Veltol</span>
            <span className="v-text-gradient font-brand text-2xl">.io</span>
          </div>
          <p className="mt-1 text-xs text-veltol-fgDim">{t("tagline")}</p>
        </div>

        <form action={action} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-veltol-fgMute">
                {t("firstNameLabel")}
              </Label>
              <Input name="first_name" required className="border-veltol-aqua/20 bg-veltol-surface/40 text-veltol-fg placeholder:text-veltol-fgMute focus-visible:ring-veltol-aqua/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-veltol-fgMute">
                {t("lastNameLabel")}
              </Label>
              <Input name="last_name" required className="border-veltol-aqua/20 bg-veltol-surface/40 text-veltol-fg placeholder:text-veltol-fgMute focus-visible:ring-veltol-aqua/50" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-veltol-fgMute">
              {t("phoneLabel")}
            </Label>
            <Input
              name="phone"
              placeholder="+36 30 000 0000"
              className="border-veltol-aqua/20 bg-veltol-surface/40 text-veltol-fg placeholder:text-veltol-fgMute focus-visible:ring-veltol-aqua/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-veltol-fgMute">
              {t("passwordLabel")}
            </Label>
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="border-veltol-aqua/20 bg-veltol-surface/40 text-veltol-fg placeholder:text-veltol-fgMute focus-visible:ring-veltol-aqua/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-veltol-fgMute">
              {t("confirmPasswordLabel")}
            </Label>
            <Input
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              required
              className="border-veltol-aqua/20 bg-veltol-surface/40 text-veltol-fg placeholder:text-veltol-fgMute focus-visible:ring-veltol-aqua/50"
            />
          </div>

          {state?.error && (
            <p className="font-mono text-[11px] text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-veltol-teal font-semibold text-white hover:bg-veltol-aqua/90 disabled:opacity-50"
          >
            {pending ? t("submitting") : t("submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
