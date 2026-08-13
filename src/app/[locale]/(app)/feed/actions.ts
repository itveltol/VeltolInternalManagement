"use server";

import { getSessionUser } from "@/core/supabase/session";
import { createSupabaseCommsClient } from "@/features/comms/api/supabaseCommsClient";
import { mergeFeed } from "@/features/comms/services/activityFeed";
import type { FeedItem } from "@/features/comms/types";

const FEED_PAGE_SIZE = 20;

async function requireAuth() {
  const { supabase, user } = await getSessionUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

export interface GlobalFeedFilter {
  projectId?: number;
  actorId?: string;
  verbGroup?: string;
  from?: string;
  to?: string;
}

// Global feed: activity_events + notes across every project the caller can
// read (RLS on both tables already scopes this — same session client as
// everywhere else in the module, never the admin client). Each source is
// fetched with .range() for this page only.
export async function getGlobalFeedPage(
  filter: GlobalFeedFilter,
  page: number,
): Promise<{ items: FeedItem[]; hasMore: boolean }> {
  const { supabase } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);

  const [eventsPage, notesPage] = await Promise.all([
    api.getActivityEvents({
      projectId: filter.projectId,
      actorId: filter.actorId,
      verbPrefix: filter.verbGroup,
      from: filter.from,
      to: filter.to,
      page,
      pageSize: FEED_PAGE_SIZE,
    }),
    api.getNotesPage({ projectId: filter.projectId, page, pageSize: FEED_PAGE_SIZE }),
  ]);

  const items = mergeFeed(eventsPage.events, notesPage.notes.filter((n) => n.parent_id === null));
  return { items, hasMore: eventsPage.hasMore || notesPage.hasMore };
}

export async function getFeedProjectOptions(): Promise<{ id: number; name: string }[]> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase.from("projects").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getFeedActorOptions(): Promise<{ id: string; name: string }[]> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase.from("profiles").select("id, first_name, last_name").order("first_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id as string,
    name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "—",
  }));
}
