"use server";

import { getSessionUser } from "@/core/supabase/session";
import type { SearchResults } from "@/features/search/types";

export async function searchAll(query: string): Promise<SearchResults> {
  const { supabase, user } = await getSessionUser();
  if (!user) throw new Error("Unauthenticated");

  const q = `%${query}%`;

  // contract_number moved off projects onto `contracts` (a project can now
  // have several) — match/join through that table instead of the dropped
  // projects.contract_number column. Two round trips (find matching
  // project_ids by contract_number, then fetch those + name/county matches)
  // since PostgREST can't OR across a join in one .or() filter expression.
  const [projectsByContractNumber, projects, clients, documents, notes] = await Promise.all([
    supabase
      .from("contracts")
      .select("project_id, contract_number")
      .ilike("contract_number", q)
      .limit(8),
    supabase
      .from("projects")
      .select("id, name, county, status, current_phase")
      .or(`name.ilike.${q},county.ilike.${q}`)
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
    supabase
      .from("notes")
      .select("id, title, body, kind, project:projects!project_id(id, name), activity:activities!activity_id(id, name)")
      .or(`title.ilike.${q},body.ilike.${q}`)
      .limit(8),
  ]);

  const nameOrCountyMatches = projects.data ?? [];
  const contractNumberMatchIds = (projectsByContractNumber.data ?? []).map((row) => row.project_id);
  const missingIds = contractNumberMatchIds.filter((id) => !nameOrCountyMatches.some((p) => p.id === id));

  const extraProjects = missingIds.length > 0
    ? (
        await supabase
          .from("projects")
          .select("id, name, county, status, current_phase")
          .in("id", missingIds)
      ).data ?? []
    : [];

  const allProjects = [...nameOrCountyMatches, ...extraProjects];
  const contractNumberByProjectId = new Map(
    (projectsByContractNumber.data ?? []).map((row) => [row.project_id, row.contract_number]),
  );
  // Fill in contract_number for every result, not just the ones that matched
  // on contract_number specifically (a name/county match still wants its
  // real contract number shown, not a blank).
  const idsNeedingContractNumber = allProjects
    .map((p) => p.id)
    .filter((id) => !contractNumberByProjectId.has(id));
  if (idsNeedingContractNumber.length > 0) {
    const { data: extraContracts } = await supabase
      .from("contracts")
      .select("project_id, contract_number")
      .in("project_id", idsNeedingContractNumber);
    for (const row of extraContracts ?? []) {
      if (!contractNumberByProjectId.has(row.project_id)) {
        contractNumberByProjectId.set(row.project_id, row.contract_number);
      }
    }
  }

  return {
    projects: allProjects.map((p) => ({
      type: "project" as const,
      ...p,
      contract_number: contractNumberByProjectId.get(p.id) ?? null,
    })),
    clients: (clients.data ?? []).map(({ type: _t, ...c }) => ({ type: "client" as const, client_type: _t, ...c })),
    documents: (documents.data ?? []).map((d) => ({ type: "document" as const, ...d })) as never,
    notes: (notes.data ?? []).map((n) => ({ type: "note" as const, ...n })) as never,
  };
}
