"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Search, FolderKanban, Building2, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/cn";
import { useSearchStore } from "../hooks/useSearchStore";
import { searchAll } from "@/app/[locale]/(app)/search/action";
import type { SearchResult, SearchResults } from "../types";

const EMPTY: SearchResults = { projects: [], clients: [], documents: [] };

export function GlobalSearchDialog() {
  const t = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();
  const isOpen = useSearchStore((s) => s.isOpen);
  const close = useSearchStore((s) => s.close);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults(EMPTY);
      setActiveIndex(0);
    }
  }, [isOpen]);

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
    close();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flat[activeIndex]) {
      navigate(flat[activeIndex]);
    }
  }

  const hasResults = flat.length > 0;
  const showEmpty = query.length >= 2 && !isPending && !hasResults;
  const showMinChars = query.length > 0 && query.length < 2;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup
          className="fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2 rounded-xl border border-white/[0.08] bg-veltol-deep shadow-2xl"
          onKeyDown={handleKeyDown}
        >
          <Dialog.Title className="sr-only">{t("title")}</Dialog.Title>

          {/* Input row */}
          <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
            {isPending ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-veltol-fgMute" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-veltol-fgMute" />
            )}
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeholder")}
              className="flex-1 bg-transparent font-mono text-sm text-veltol-fg placeholder:text-veltol-fgMute outline-none"
            />
            <kbd className="rounded border border-white/10 bg-veltol-surface/60 px-1.5 py-0.5 font-mono text-[10px] text-veltol-fgMute">
              ESC
            </kbd>
          </div>

          {/* Results */}
          {(hasResults || showEmpty || showMinChars) && (
            <div className="max-h-[60vh] overflow-y-auto py-2">
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
                      icon={<FolderKanban className="h-3.5 w-3.5 text-veltol-aqua" />}
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
                      icon={<Building2 className="h-3.5 w-3.5 text-veltol-teal" />}
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
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
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
          ? "border-veltol-aqua bg-veltol-surface/80"
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
