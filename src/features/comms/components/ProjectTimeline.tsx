"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { getProjectTimelinePage } from "@/app/[locale]/(app)/board/actions";
import { filterFeed, type FeedFilter } from "../services/activityFeed";
import { ActivityEventRow } from "./ActivityEventRow";
import { NoteCard } from "./NoteCard";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import type { FeedItem } from "../types";

interface Props {
  projectId: number;
  initialItems: FeedItem[];
  initialHasMore: boolean;
  onOpenNote?: (rootId: number) => void;
}

const FILTERS: FeedFilter[] = ["all", "people", "system"];

export function ProjectTimeline({ projectId, initialItems, initialHasMore, onOpenNote }: Props) {
  const t = useTranslations("comms");
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const nextPage = page + 1;
      const result = await getProjectTimelinePage(projectId, nextPage);
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    });
  }

  const visible = filterFeed(items, filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "min-h-[36px] rounded-full px-3 text-[12px] font-medium transition-colors",
              filter === f
                ? "bg-veltol-accent/10 text-veltol-accent"
                : "text-veltol-fgMute hover:text-veltol-fgDim",
            )}
            aria-pressed={filter === f}
          >
            {t(`feed.filter.${f}`)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-[13px] text-veltol-fgMute">{t("timeline.empty")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {visible.map((item) =>
            item.kind === "event" ? (
              <ActivityEventRow key={`event-${item.events[0].id}`} group={item} />
            ) : (
              <div key={`note-${item.note.id}`} className="py-2">
                <NoteCard note={item.note} onClick={() => onOpenNote?.(item.note.id)} />
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
