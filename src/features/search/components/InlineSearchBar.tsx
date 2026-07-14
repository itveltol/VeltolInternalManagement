"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Search, FolderKanban, Building2, FileText, Loader2, X } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/cn";
import { searchAll } from "@/app/[locale]/(app)/search/action";
import type { SearchResult, SearchResults } from "../types";

const EMPTY: SearchResults = { projects: [], clients: [], documents: [] };

export function InlineSearchBar() {
  const t = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose focus handle for ⌘K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(EMPTY);
      setActiveIndex(0);
      return;
    }
    const id = setTimeout(() => {
      startTransition(async () => {
        const r = await searchAll(query);
        setResults(r);
        setActiveIndex(0);
      });
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const flat: SearchResult[] = [
    ...results.projects,
    ...results.clients,
    ...results.documents,
  ];

  function navigate(item: SearchResult) {
    if (item.type === "project") {
      router.push(`/${locale}/projects/${item.id}`);
    } else if (item.type === "client") {
      router.push(`/${locale}/clients`);
    } else {
      window.open(item.url, "_blank");
    }
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flat[activeIndex]) {
      navigate(flat[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const hasResults = flat.length > 0;
  const showEmpty = query.length >= 2 && !isPending && !hasResults;
  const showMinChars = query.length > 0 && query.length < 2;
  const showDropdown = open && (hasResults || showEmpty || showMinChars || isPending);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className="flex w-full items-center gap-3 rounded-lg border border-border bg-veltol-surface/40 px-4 py-3 transition-colors focus-within:border-veltol-accent/40 focus-within:bg-veltol-surface/70">
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-veltol-fgMute" />
        ) : (
          <Search className="h-3.5 w-3.5 shrink-0 text-veltol-fgMute" />
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          className="flex-1 bg-transparent font-mono text-[12px] text-veltol-fg placeholder:text-veltol-fgMute outline-none min-w-0"
        />
        {query ? (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults(EMPTY); inputRef.current?.focus(); }}
            className="text-veltol-fgMute hover:text-veltol-fg transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <kbd className="shrink-0 rounded border border-border bg-veltol-surface/60 px-1.5 py-0.5 font-mono text-[10px] text-veltol-fgMute">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-full -translate-x-1/2 rounded-xl border border-border bg-card shadow-2xl">
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {isPending && !hasResults && (
              <p className="px-4 py-6 text-center font-mono text-xs text-veltol-fgMute">
                {t("loading")}
              </p>
            )}
            {showMinChars && (
              <p className="px-4 py-6 text-center font-mono text-xs text-veltol-fgMute">
                {t("minChars")}
              </p>
            )}
            {showEmpty && (
              <p className="px-4 py-6 text-center font-mono text-xs text-veltol-fgMute">
                {t("empty", { query })}
              </p>
            )}

            {results.projects.length > 0 && (
              <Section label={t("groupProjects")}>
                {results.projects.map((p, i) => (
                  <ResultItem
                    key={p.id}
                    icon={<FolderKanban className="h-3.5 w-3.5 text-veltol-accent" />}
                    title={p.name}
                    subtitle={[p.county, p.contract_number].filter(Boolean).join(" · ")}
                    badge={p.current_phase}
                    badgeVariant="info"
                    active={activeIndex === i}
                    onClick={() => navigate(p)}
                  />
                ))}
              </Section>
            )}

            {results.clients.length > 0 && (
              <Section label={t("groupClients")}>
                {results.clients.map((c, i) => (
                  <ResultItem
                    key={c.id}
                    icon={<Building2 className="h-3.5 w-3.5 text-veltol-primary" />}
                    title={c.name}
                    subtitle={c.contact_person ?? c.cui ?? ""}
                    badge={c.client_type}
                    badgeVariant="secondary"
                    active={activeIndex === results.projects.length + i}
                    onClick={() => navigate(c)}
                  />
                ))}
              </Section>
            )}

            {results.documents.length > 0 && (
              <Section label={t("groupDocuments")}>
                {results.documents.map((d, i) => (
                  <ResultItem
                    key={d.id}
                    icon={<FileText className="h-3.5 w-3.5 text-veltol-fgDim" />}
                    title={d.name}
                    subtitle={d.project?.name ?? d.linked_type}
                    badge={d.linked_type}
                    badgeVariant="outline"
                    active={activeIndex === results.projects.length + results.clients.length + i}
                    onClick={() => navigate(d)}
                  />
                ))}
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-4 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-veltol-fgMute">
        {label}
      </p>
      {children}
    </div>
  );
}

function ResultItem({
  icon, title, subtitle, badge, badgeVariant, active, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "info" | "outline";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 border-l-2 px-4 py-2 text-left transition-colors",
        active
          ? "border-veltol-accent bg-veltol-surface/80"
          : "border-transparent hover:bg-veltol-surface/40",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-sm text-veltol-fg">{title}</span>
        {subtitle && (
          <span className="block truncate font-mono text-[11px] text-veltol-fgMute">{subtitle}</span>
        )}
      </span>
      <Badge variant={badgeVariant}>{badge}</Badge>
    </button>
  );
}
