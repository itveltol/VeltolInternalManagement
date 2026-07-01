"use server";

import { createClient } from "@/core/supabase/server";
import type { SearchResults } from "@/features/search/types";

export async function searchAll(query: string): Promise<SearchResults> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const q = `%${query}%`;

  const [projects, clients, documents] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, county, contract_number, status, current_phase")
      .or(`name.ilike.${q},county.ilike.${q},contract_number.ilike.${q}`)
      .limit(8),
    supabase
      .from("clients")
      .select("id, type, name, cui, contact_person")
      .or(`name.ilike.${q},cui.ilike.${q},contact_person.ilike.${q}`)
      .limit(8),
    supabase
      .from("documents")
      .select("id, name, url, linked_type, project:projects!project_id(id, name)")
      .ilike("name", q)
      .limit(8),
  ]);

  return {
    projects: (projects.data ?? []).map((p) => ({ type: "project" as const, ...p })),
    clients: (clients.data ?? []).map(({ type: _t, ...c }) => ({ type: "client" as const, client_type: _t, ...c })),
    documents: (documents.data ?? []).map((d) => ({ type: "document" as const, ...d })) as never,
  };
}
