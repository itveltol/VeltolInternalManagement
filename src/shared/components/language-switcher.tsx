"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Globe, Loader2 } from "lucide-react";

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
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: Locale) {
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.09em] text-veltol-fgDim transition-colors hover:bg-[#F3F6FC] disabled:pointer-events-none disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Globe className="h-3.5 w-3.5" />
        )}
        {LOCALE_FLAGS[locale]}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-36 border-border bg-card text-veltol-fg"
      >
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => switchLocale(l)}
            disabled={isPending}
            className={`cursor-pointer text-[13px] ${
              l === locale
                ? "text-veltol-accent focus:bg-veltol-tint focus:text-veltol-accent"
                : "text-veltol-fg focus:bg-[#F3F6FC]"
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
