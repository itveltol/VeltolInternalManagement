"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const LOCALE_LABELS: Record<Locale, string> = {
  hu: "Magyar",
  en: "English",
  ro: "Română",
};

const LOCALE_FLAGS: Record<Locale, string> = {
  hu: "HU",
  en: "EN",
  ro: "RO",
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(next: Locale) {
    router.replace(pathname, { locale: next });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-veltol-fgMute transition-colors hover:bg-veltol-surface/50 hover:text-veltol-fg">
        <Globe className="h-3.5 w-3.5" />
        {LOCALE_FLAGS[locale]}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-36 border-veltol-aqua/10 bg-veltol-bg text-veltol-fg"
      >
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => switchLocale(l)}
            className={`cursor-pointer font-mono text-[11px] ${
              l === locale
                ? "text-veltol-aqua focus:bg-veltol-aqua/10 focus:text-veltol-aqua"
                : "text-veltol-fg focus:bg-veltol-surface/50"
            }`}
          >
            <span className="mr-2 font-bold">{LOCALE_FLAGS[l]}</span>
            {LOCALE_LABELS[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
