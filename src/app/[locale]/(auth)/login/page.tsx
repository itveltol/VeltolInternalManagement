"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/core/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(t("errorInvalid"));
      setLoading(false);
      return;
    }

    router.push(`/${locale}/dashboard`);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-veltol-primary p-4">
      {/* Flat brand-blue hero panel */}
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-veltol-bg p-8">
        {/* Brand lockup */}
        <div className="mb-8 text-center">
          <span className="text-xs font-medium text-veltol-fgMute">
            {t("platform")}
          </span>
          <div className="mt-2">
            <span className="text-2xl font-semibold text-veltol-fg">Veltol</span>
            <span className="text-2xl font-semibold text-veltol-accent">.io</span>
          </div>
          <p className="mt-1 text-xs text-veltol-fgDim">
            {t("tagline")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-medium text-veltol-fgMute"
            >
              {t("emailLabel")}
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="border-veltol-border bg-veltol-surface/40 text-veltol-fg placeholder:text-veltol-fgMute focus-visible:ring-veltol-accent/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-medium text-veltol-fgMute"
            >
              {t("passwordLabel")}
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="border-veltol-border bg-veltol-surface/40 text-veltol-fg placeholder:text-veltol-fgMute focus-visible:ring-veltol-accent/50"
            />
          </div>

          {error && (
            <p className="text-[13px] text-veltol-red">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-veltol-primary font-semibold text-white hover:bg-veltol-primaryHi disabled:opacity-50"
          >
            {loading ? t("signingIn") : t("signIn")}
          </Button>
        </form>
      </div>
    </div>
  );
}
