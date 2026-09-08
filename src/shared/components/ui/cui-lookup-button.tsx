"use client";

import { useTranslations } from "next-intl";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface CuiLookupButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  className?: string;
}

export function CuiLookupButton({ onClick, loading, disabled, className }: CuiLookupButtonProps) {
  const t = useTranslations("clients.fields");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] transition-colors",
        "text-veltol-accent/70 hover:text-veltol-accent",
        (disabled || loading) && "opacity-40 pointer-events-none",
        className,
      )}
    >
      {loading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
      {loading ? t("cuiLookingUp") : t("cuiLookup")}
    </button>
  );
}
