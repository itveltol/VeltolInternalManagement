"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  FolderKanban,
  Grid2X2,
  GanttChartSquare,
  Settings,
  LogOut,
  User,
  CalendarDays,
  Building2,
  FileText,
  HardHat,
  Users,
  UsersRound,
  Loader2,
  Bell,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { createClient } from "@/core/supabase/client";
import { cn } from "@/shared/utils/cn";

export function NavContent({
  displayName,
  initials,
  onNavigate,
  collapsed = false,
}: {
  displayName?: string | null;
  initials?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, startSignOut] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Clear the pending indicator once the new route has actually rendered —
  // derived during render (not an effect), following React's documented
  // "adjusting state during render" pattern for props/state comparisons.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (pendingHref !== null) setPendingHref(null);
  }

  const NAV_GROUPS = [
    {
      label: t("mainMenuGroup"),
      items: [
        { href: `/${locale}/dashboard`, label: t("dashboard"), icon: LayoutDashboard },
        { href: `/${locale}/projects`, label: t("projects"), icon: FolderKanban },
        { href: `/${locale}/matrice-status`, label: t("matriceStatus"), icon: Grid2X2 },
        { href: `/${locale}/clients`, label: t("clients"), icon: Building2 },
        { href: `/${locale}/documents`, label: t("documents"), icon: FileText },
        { href: `/${locale}/site`, label: t("site"), icon: HardHat },
        { href: `/${locale}/teams`, label: t("teams"), icon: UsersRound },
        { href: `/${locale}/gantt`, label: t("gantt"), icon: GanttChartSquare },
        { href: `/${locale}/vacation`, label: t("vacation"), icon: CalendarDays },
        { href: `/${locale}/pontaj`, label: t("pontaj"), icon: Users },
      ],
    },
    {
      label: t("accountGroup"),
      items: [
        { href: `/${locale}/profile`, label: t("profile"), icon: User },
        { href: `/${locale}/settings`, label: t("settings"), icon: Settings },
      ],
    },
  ];

  function handleSignOut() {
    startSignOut(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push(`/${locale}/login`);
      router.refresh();
    });
  }

  function handleNavClick(e: React.MouseEvent, href: string) {
    // Let Link handle the actual navigation (preserves prefetch, modifier-key
    // behavior for opening in new tabs, etc.) — just track which item was
    // clicked so it can show a spinner until the new route finishes loading.
    if (href === pathname) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    setPendingHref(href);
    onNavigate?.();
  }

  return (
    <>
      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[.13em] text-veltol-fgMute">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const isPending = pendingHref === item.href;
                const Icon = item.icon;
                return isActive ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex h-[42px] items-center gap-2.5 rounded-nav bg-veltol-tint px-3 text-[14px] font-bold text-veltol-primary shadow-[inset_0_0_0_1px_rgba(47,107,237,0.16)] transition-colors duration-150",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-veltol-primary" />
                    {!collapsed && item.label}
                  </Link>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    aria-busy={isPending}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex h-[42px] items-center gap-2.5 rounded-nav px-3 text-[14px] font-medium text-veltol-fgDim transition-colors duration-150 hover:bg-[#F3F6FC] hover:text-veltol-fg",
                      isPending && "opacity-60",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-veltol-fgMute" />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0 text-veltol-fgMute" />
                    )}
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            title={collapsed ? (displayName ?? undefined) : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#F3F6FC] transition-colors",
              collapsed && "justify-center",
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-[#E7ECF4] text-[11px] font-bold text-[#5A6478]">
                {initials ?? "?"}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-[14px] font-bold text-veltol-fg">
                    {displayName ?? "—"}
                  </div>
                </div>
                <Bell className="h-3.5 w-3.5 shrink-0 text-veltol-fgMute" />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-52 border-border bg-popover text-veltol-fg"
          >
            <DropdownMenuItem
              render={<Link href={`/${locale}/profile`} />}
              onClick={(e) => handleNavClick(e, `/${locale}/profile`)}
              className="cursor-pointer"
            >
              {pendingHref === `/${locale}/profile` ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <User className="mr-2 h-4 w-4" />
              )}
              {t("profile")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="cursor-pointer text-veltol-red focus:bg-veltol-red/10 focus:text-veltol-red disabled:cursor-default disabled:opacity-60"
            >
              {isSigningOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              {isSigningOut ? t("signingOut") : t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
