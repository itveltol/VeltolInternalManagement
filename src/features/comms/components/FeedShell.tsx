"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { getGlobalFeedPage, type GlobalFeedFilter } from "@/app/[locale]/(app)/feed/actions";
import { filterFeed, type FeedFilter } from "../services/activityFeed";
import { ActivityEventRow } from "./ActivityEventRow";
import { NoteCard } from "./NoteCard";
import { Select } from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import type { FeedItem } from "../types";

interface Props {
  initialItems: FeedItem[];
  initialHasMore: boolean;
  projectOptions: { id: number; name: string }[];
  actorOptions: { id: string; name: string }[];
}

const HUMAN_SYSTEM_FILTERS: FeedFilter[] = ["all", "people", "system"];
const VERB_GROUPS = ["project", "matrice", "situation", "document", "vacation"] as const;

export function FeedShell({ initialItems, initialHasMore, projectOptions, actorOptions }: Props) {
  const t = useTranslations("comms");
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(0);
  const [humanSystemFilter, setHumanSystemFilter] = useState<FeedFilter>("all");
  const [filter, setFilter] = useState<GlobalFeedFilter>({});
  const [isPending, startTransition] = useTransition();

  function reload(nextFilter: GlobalFeedFilter) {
    setFilter(nextFilter);
    startTransition(async () => {
      const result = await getGlobalFeedPage(nextFilter, 0);
      setItems(result.items);
      setHasMore(result.hasMore);
      setPage(0);
    });
  }

  function loadMore() {
    startTransition(async () => {
      const nextPage = page + 1;
      const result = await getGlobalFeedPage(filter, nextPage);
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    });
  }

  const visible = filterFeed(items, humanSystemFilter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
            {t("feed.filters.project")}
          </label>
          <Select
            value={filter.projectId ?? ""}
            onChange={(e) => reload({ ...filter, projectId: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">{t("feed.filters.allProjects")}</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
            {t("feed.filters.actor")}
          </label>
          <Select
            value={filter.actorId ?? ""}
            onChange={(e) => reload({ ...filter, actorId: e.target.value || undefined })}
          >
            <option value="">{t("feed.filters.allActors")}</option>
            {actorOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
            {t("feed.filters.verbGroup")}
          </label>
          <Select
            value={filter.verbGroup ?? ""}
            onChange={(e) => reload({ ...filter, verbGroup: e.target.value || undefined })}
          >
            <option value="">{t("feed.filters.allVerbGroups")}</option>
            {VERB_GROUPS.map((g) => (
              <option key={g} value={g}>
                {t(`feed.verbGroup.${g}`)}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
            {t("feed.filters.dateFrom")}
          </label>
          <input
            type="date"
            value={filter.from ?? ""}
            onChange={(e) => reload({ ...filter, from: e.target.value || undefined })}
            className="flex h-10 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-[13px] text-veltol-fg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>

        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
            {t("feed.filters.dateTo")}
          </label>
          <input
            type="date"
            value={filter.to ?? ""}
            onChange={(e) => reload({ ...filter, to: e.target.value || undefined })}
            className="flex h-10 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-[13px] text-veltol-fg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-1" role="tablist" aria-label={t("feed.filter.all")}>
        {HUMAN_SYSTEM_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={humanSystemFilter === f}
            onClick={() => setHumanSystemFilter(f)}
            className={cn(
              "min-h-[44px] rounded-full px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              humanSystemFilter === f
                ? "bg-veltol-accent/10 text-veltol-accent"
                : "text-veltol-fgMute hover:text-veltol-fgDim",
            )}
          >
            {t(`feed.filter.${f}`)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-[13px] text-veltol-fgMute">{t("feed.empty")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-card border border-border bg-card px-4">
          {visible.map((item) =>
            item.kind === "event" ? (
              <ActivityEventRow key={`event-${item.events[0].id}`} group={item} />
            ) : (
              <div key={`note-${item.note.id}`} className="py-2">
                <NoteCard note={item.note} />
              </div>
            ),
          )}
        </div>
      )}

      {hasMore && (
        <Button variant="outline" size="sm" onClick={loadMore} disabled={isPending}>
          {t("feed.loadMore")}
        </Button>
      )}
    </div>
  );
}
