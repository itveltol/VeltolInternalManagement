"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(120deg, #0B1E3E 0%, #163D64 20%, rgba(192,66,255,0.25) 45%, #1E8FA2 70%, #2BC4C8 100%)",
      }}
    >
      {/* Frosted glass card */}
      <div className="v-panel v-hairline relative w-full max-w-sm rounded-2xl p-8 shadow-[0_16px_40px_-10px_rgba(30,143,162,0.45)]">
        {/* Brand lockup */}
        <div className="mb-8 text-center">
          <span className="mono-label text-[10px] text-veltol-fgMute">
            {t("platform")}
          </span>
          <div className="mt-2">
            <span className="font-brand text-2xl text-veltol-fg">Veltol</span>
            <span className="v-text-gradient font-brand text-2xl">.io</span>
          </div>
          <p className="mt-1 text-xs text-veltol-fgDim">
            {t("tagline")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-veltol-fgMute"
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
              className="border-veltol-aqua/20 bg-veltol-surface/40 text-veltol-fg placeholder:text-veltol-fgMute focus-visible:ring-veltol-aqua/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-veltol-fgMute"
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
              className="border-veltol-aqua/20 bg-veltol-surface/40 text-veltol-fg placeholder:text-veltol-fgMute focus-visible:ring-veltol-aqua/50"
            />
          </div>

          {error && (
            <p className="font-mono text-[11px] text-veltol-red">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-veltol-teal font-semibold text-white hover:bg-veltol-aqua/90 disabled:opacity-50"
          >
            {loading ? t("signingIn") : t("signIn")}
          </Button>
        </form>
      </div>
    </div>
  );
}
