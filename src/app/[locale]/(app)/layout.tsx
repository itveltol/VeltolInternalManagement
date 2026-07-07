import { AppShellClient } from "@/shared/components/layout/AppShellClient";
import { createClient } from "@/core/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  let initials = "?";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .single();

    if (profile) {
      const f = profile.first_name ?? "";
      const l = profile.last_name ?? "";
      displayName =
        f || l ? `${f} ${l}`.trim() : (profile.email ?? user.email ?? null);
      const fi = f?.[0] ?? "";
      const li = l?.[0] ?? "";
      initials =
        fi || li
          ? (fi + li).toUpperCase()
          : (profile.email?.[0] ?? user.email?.[0] ?? "?").toUpperCase();
    } else {
      displayName = user.email ?? null;
      initials = (user.email?.[0] ?? "?").toUpperCase();
    }
  }

  return (
    <AppShellClient displayName={displayName} initials={initials}>
      {children}
    </AppShellClient>
  );
}
