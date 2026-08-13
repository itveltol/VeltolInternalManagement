"use client";

import { useEffect, useState } from "react";
import { getNotifications } from "@/app/[locale]/(app)/board/actions";

const POLL_INTERVAL_MS = 120_000;

export function AnnouncementsNavBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function reload() {
      const notifications = await getNotifications();
      if (cancelled) return;
      setCount(notifications.filter((n) => n.type === "ack_required" && n.read_at === null).length);
    }

    reload();
    const interval = setInterval(reload, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--v-warning)] px-1 text-[10px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
