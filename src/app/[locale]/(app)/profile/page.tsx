import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/core/supabase/session";
import { getAllUsers } from "./actions";
import { getVacationBalance } from "../vacation/actions";
import { ProfileShell } from "@/features/profile/components/ProfileShell";
import type { Profile } from "@/features/profile/types";

export default async function ProfilePage() {
  const { supabase, user } = await getSessionUser();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const [allUsers, balance] = await Promise.all([
    isAdmin ? getAllUsers() : Promise.resolve([]),
    getVacationBalance(),
  ]);
  const t = await getTranslations("profile");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      <ProfileShell
        profile={profile as Profile}
        allUsers={allUsers}
        currentUserId={user.id}
        isAdmin={isAdmin}
        balance={balance}
      />
    </div>
  );
}
