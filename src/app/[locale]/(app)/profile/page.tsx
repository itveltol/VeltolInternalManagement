import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getAllUsers } from "./actions";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { UserTable } from "./UserTable";
import type { Profile } from "@/lib/types/profile";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  console.log("user:", user);
  console.log("profile:", profile);
  console.log("profileError:", profileError);
  const allUsers = isAdmin ? await getAllUsers() : [];

  const t = await getTranslations("profile");

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <div className="mono-label text-[10px] text-veltol-fgMute">
          {t("eyebrow")}
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      {/* Profile form */}
      <ProfileForm profile={profile as Profile} />

      {/* Password form */}
      <PasswordForm />

      {/* Admin: user management */}
      {isAdmin && (
        <UserTable users={allUsers} currentUserId={user.id} />
      )}
    </div>
  );
}
