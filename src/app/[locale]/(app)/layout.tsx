import { Sidebar } from "@/shared/components/layout/sidebar";
import { Topbar } from "@/shared/components/layout/topbar";
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
    <div className="flex h-screen overflow-hidden bg-veltol-void">
      <Sidebar displayName={displayName} initials={initials} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
