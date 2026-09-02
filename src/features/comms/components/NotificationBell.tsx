"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import {
  Bell,
  AtSign,
  MessageSquare,
  CheckCircle2,
  Clock,
  FileWarning,
  Wrench,
  CalendarDays,
  UserCheck,
  ListTodo,
  Info,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { getNotifications, markNotificationsReadAction } from "@/app/[locale]/(app)/board/actions";
import { groupNotificationsByAge, unreadCount } from "../services/notes";
import type { Notification, NotificationType } from "../types";

const POLL_INTERVAL_MS = 60_000;

const TYPE_ICON: Record<NotificationType, typeof AtSign> = {
  mention: AtSign,
  reply: MessageSquare,
  ack_required: CheckCircle2,
  due_soon: Clock,
  aviz_expiring: FileWarning,
  maintenance_due: Wrench,
  vacation_request: CalendarDays,
  project_assigned: UserCheck,
  task_assigned: ListTodo,
  system: Info,
};

export function NotificationBell() {
  const t = useTranslations("comms");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPending, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function reload() {
    startTransition(async () => {
      const fresh = await getNotifications();
      setNotifications(fresh);
    });
  }

  useEffect(() => {
    reload();

    function startPolling() {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(reload, POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    function handleVisibility() {
      if (document.visibilityState === "hidden") stopPolling();
      else { reload(); startPolling(); }
    }

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const unread = unreadCount(notifications);
  const groups = groupNotificationsByAge(notifications, new Date());

  function handleMarkAllRead() {
    startTransition(async () => {
      await markNotificationsReadAction();
      reload();
    });
  }

  function handleClickNotification(n: Notification) {
    if (n.read_at === null) {
      startTransition(async () => {
        await markNotificationsReadAction([n.id]);
        reload();
      });
    }
    setOpen(false);
    if (n.href) router.push(`/${locale}${n.href}`);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("notifications.title")}
            className="relative h-[38px] w-[38px] text-veltol-fgMute hover:bg-veltol-hover hover:text-veltol-fg"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--v-danger)] px-0.5 text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>
        }
      />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed right-3 top-14 z-50 max-h-[70vh] w-[calc(100%-1.5rem)] max-w-sm overflow-y-auto rounded-xl border border-border bg-card shadow-2xl sm:right-6">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <Dialog.Title className="text-[14px] font-semibold text-veltol-fg">
              {t("notifications.title")}
            </Dialog.Title>
            {unread > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={isPending}>
                {t("notifications.markAllRead")}
              </Button>
            )}
          </div>

          {groups.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-veltol-fgMute">
              {t("notifications.empty")}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[.1em] text-veltol-fgMute">
                  {t(`notifications.group.${group.label}`)}
                </p>
                {group.items.map((n) => {
                  const Icon = TYPE_ICON[n.type];
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleClickNotification(n)}
                      className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-veltol-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-veltol-fgMute" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] text-veltol-fg">
                          {n.payload.actorName && <strong>{n.payload.actorName}</strong>}{" "}
                          {t(`notifications.type.${n.type}`)}
                          {n.payload.projectName ? ` · ${n.payload.projectName}` : ""}
                        </span>
                        {n.payload.snippet && (
                          <span className="block truncate text-[12px] text-veltol-fgMute">
                            {n.payload.snippet}
                          </span>
                        )}
                      </span>
                      {n.read_at === null && (
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-veltol-accent" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
