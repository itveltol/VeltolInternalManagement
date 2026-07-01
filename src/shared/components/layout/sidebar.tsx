"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  FolderKanban,
  Grid2X2,
  Settings,
  LogOut,
  ChevronRight,
  User,
  CalendarDays,
  Building2,
  FileText,
  HardHat,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { createClient } from "@/core/supabase/client";

export function Sidebar({
  displayName,
  initials,
}: {
  displayName?: string | null;
  initials?: string;
}) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const NAV_GROUPS = [
    {
      label: t("overview"),
      items: [
        { href: `/${locale}/dashboard`, label: t("dashboard"), icon: LayoutDashboard },
      ],
    },
    {
      label: t("work"),
      items: [
        { href: `/${locale}/projects`, label: t("projects"), icon: FolderKanban },
        { href: `/${locale}/clients`, label: t("clients"), icon: Building2 },
        { href: `/${locale}/matrice-status`, label: t("matriceStatus"), icon: Grid2X2 },
        { href: `/${locale}/vacation`, label: t("vacation"), icon: CalendarDays },
      ],
    },
    {
      label: t("delivery"),
      items: [
        { href: `/${locale}/documents`, label: t("documents"), icon: FileText },
        { href: `/${locale}/site`, label: t("site"), icon: HardHat },
        { href: `/${locale}/pontaj`, label: t("pontaj"), icon: Users },
      ],
    },
    {
      label: t("system"),
      items: [
        { href: `/${locale}/profile`, label: t("profile"), icon: User },
        { href: `/${locale}/settings`, label: t("settings"), icon: Settings },
      ],
    },
  ];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
    router.refresh();
  }

  return (
    <aside
      className="flex h-screen w-64 shrink-0 flex-col border-r border-white/[0.07]"
      style={{ background: "rgba(6, 15, 26, 0.75)", backdropFilter: "blur(20px)" }}
    >
      {/* Brand lockup */}
      <div className="flex h-[62px] shrink-0 items-center gap-2.5 border-b border-white/[0.07] px-5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold text-white shadow-v-glow"
          style={{
            background:
              "linear-gradient(135deg, #0B1E3E 0%, #163D64 25%, #1A5F88 45%, #1E8FA2 70%, #2BC4C8 100%)",
          }}
        >
          V
        </div>
        <div>
          <span className="font-brand text-[15px] text-veltol-fg">Veltol</span>
          <span className="v-text-gradient font-brand text-[15px]">.io</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 px-3 font-mono text-[9px] uppercase tracking-[0.2em] text-veltol-fgMute">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return isActive ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-md border border-veltol-aqua/25 bg-veltol-aqua/10 px-3 py-2 text-[13px] font-semibold text-veltol-aqua"
                  >
                    <Icon className="h-4 w-4 text-veltol-aqua" />
                    {item.label}
                  </Link>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-md border border-transparent px-3 py-2 text-[13px] text-veltol-fg/80 hover:bg-veltol-surface/50 hover:text-veltol-fg transition-colors"
                  >
                    <Icon className="h-4 w-4 text-veltol-fgMute" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-white/[0.07] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-veltol-surface/50 transition-colors">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback
                className="text-[11px] font-bold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #0B1E3E 0%, #163D64 25%, #1A5F88 45%, #1E8FA2 70%, #2BC4C8 100%)",
                }}
              >
                {initials ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-[13px] font-semibold text-veltol-fg">
                {displayName ?? "—"}
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-veltol-fgMute" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-52 border-veltol-aqua/10 bg-veltol-bg text-veltol-fg"
          >
            <DropdownMenuItem
              onClick={() => router.push(`/${locale}/profile`)}
              className="cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              {t("profile")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-veltol-red focus:bg-veltol-red/10 focus:text-veltol-red"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
