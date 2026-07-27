"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/shared/components/theme-provider";

export function ThemeSwitcher() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? t("switchToLight") : t("switchToDark")}
      aria-label={isDark ? t("switchToLight") : t("switchToDark")}
      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-border text-veltol-fgMute transition-colors hover:bg-veltol-hover hover:text-veltol-fg"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
