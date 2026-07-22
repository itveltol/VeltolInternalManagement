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
    <div className="flex min-h-screen items-center justify-center bg-veltol-bg p-4">
      <div className="relative w-full max-w-sm rounded-card border border-border bg-card p-8 shadow-panel">
        {/* Brand lockup */}
        <div className="mb-8 text-center">
          <span className="mono-label text-[11px] tracking-[0.14em] text-veltol-fgMute">
            {t("platform")}
          </span>
          <div className="mt-2">
            <span className="font-display text-2xl text-veltol-fg">Veltol</span>
            <span className="font-display text-2xl text-veltol-accent">.io</span>
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
              className="border-veltol-border bg-card text-veltol-fg placeholder:text-veltol-faint focus-visible:ring-veltol-accent/20"
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
              className="border-veltol-border bg-card text-veltol-fg placeholder:text-veltol-faint focus-visible:ring-veltol-accent/20"
            />
          </div>

          {error && (
            <p className="text-[13px] text-veltol-red">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t("signingIn") : t("signIn")}
          </Button>
        </form>
      </div>
    </div>
  );
}
