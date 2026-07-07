"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { updateProfile } from "@/app/[locale]/(app)/profile/actions";
import type { Profile, AppRole } from "../types";

const ROLE_VARIANT: Record<AppRole, "default" | "warning" | "info" | "secondary" | "success" | "outline"> = {
  admin: "default",
  project_manager: "info",
  site_engineer: "warning",
  finance: "success",
  viewer: "secondary",
  outfield_worker: "outline",
};

function initials(profile: Profile | null): string {
  if (!profile) return "?";
  const f = profile.first_name?.[0] ?? "";
  const l = profile.last_name?.[0] ?? "";
  if (f || l) return (f + l).toUpperCase();
  return (profile.email?.[0] ?? "?").toUpperCase();
}

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const t = useTranslations("profile");
  const [state, action, pending] = useActionState(updateProfile, null);
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");

  return (
    <div className="v-panel v-hairline overflow-hidden rounded-xl">
      <div className="flex flex-col gap-0 md:flex-row">
        {/* Identity column */}
        <div className="flex flex-col items-center gap-4 border-b border-white/[0.06] px-8 py-8 md:w-56 md:shrink-0 md:border-b-0 md:border-r">
          <Avatar className="h-20 w-20">
            <AvatarFallback
              className="font-brand text-2xl font-bold text-white"
              style={{
                background:
                  "linear-gradient(135deg, #0B1E3E 0%, #163D64 25%, #1A5F88 45%, #1E8FA2 70%, #2BC4C8 100%)",
              }}
            >
              {initials(profile)}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <div className="text-[15px] font-semibold text-veltol-fg">
              {profile?.first_name || profile?.last_name
                ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
                : "—"}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-veltol-fgMute">
              {profile?.email}
            </div>
          </div>

          {profile?.role && (
            <Badge variant={ROLE_VARIANT[profile.role]}>
              {t(`role_${profile.role}`)}
            </Badge>
          )}

          <div className="w-full space-y-1 text-left">
            {profile?.phone && (
              <div>
                <div className="mono-label text-[9px] text-veltol-fgMute">
                  {t("phone")}
                </div>
                <div className="font-mono text-[12px] text-veltol-fgDim">
                  {profile.phone}
                </div>
              </div>
            )}
            {profile?.created_at && (
              <div>
                <div className="mono-label text-[9px] text-veltol-fgMute">
                  {t("joined")}
                </div>
                <div className="font-mono text-[12px] text-veltol-fgDim">
                  {new Date(profile.created_at).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit form column */}
        <div className="flex-1 px-8 py-8">
          <div className="mono-label mb-1 text-[9px] text-veltol-fgMute">
            {t("personalTitle")}
          </div>
          <p className="mb-6 text-sm text-veltol-fgDim">{t("personalDesc")}</p>

          <form action={action} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">
                  {t("firstName")}
                </Label>
                <Input
                  name="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("firstName")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">
                  {t("lastName")}
                </Label>
                <Input
                  name="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("lastName")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="mono-label text-[9px] text-veltol-fgMute">
                {t("email")}
              </Label>
              <Input
                value={profile?.email ?? ""}
                onChange={() => {}}
                disabled
                className="opacity-50"
                readOnly
              />
            </div>

            <div className="space-y-1.5">
              <Label className="mono-label text-[9px] text-veltol-fgMute">
                {t("phone")}
              </Label>
              <Input
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+36 30 000 0000"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>
            )}
            {state?.success && (
              <p className="text-sm text-veltol-green">
                {t(state.success as Parameters<typeof t>[0])}
              </p>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={pending}
                className="min-w-[120px]"
              >
                {pending ? t("saving") : t("saveProfile")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
