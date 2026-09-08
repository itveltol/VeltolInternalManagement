import type { SupabaseClient } from '@supabase/supabase-js';
import { DependencyError, type MatriceApiClient } from './types';
import type { Activity, ActivityDependency, MatricePhase, MatrixCell, MatrixProject, ActivityStatus } from '../types';
import type { ContractType } from '@/features/projects/types';

/**
 * contract_type moved off `projects` onto `contracts` (a project can now
 * have several — see supabase/migrations/20260908000127_create_contracts.sql).
 * MatrixProject.contract_type keeps its old shape (one flat array) as the
 * UNION across all of a project's contracts' own contract_type arrays — same
 * phase-eligibility semantics isPhaseEnabled()/projectCompletionPct() already
 * had, just sourced from multiple contracts instead of one column.
 */
async function attachUnionedContractTypes(
  supabase: SupabaseClient,
  projects: Omit<MatrixProject, 'contract_type'>[],
): Promise<MatrixProject[]> {
  if (projects.length === 0) return [];
  const { data, error } = await supabase
    .from('contracts')
    .select('project_id, contract_type')
    .in('project_id', projects.map((p) => p.id));
  if (error) throw new Error(error.message);

  const typesByProjectId = new Map<number, Set<ContractType>>();
  for (const row of (data ?? []) as { project_id: number; contract_type: ContractType[] }[]) {
    const set = typesByProjectId.get(row.project_id) ?? new Set<ContractType>();
    for (const t of row.contract_type) set.add(t);
    typesByProjectId.set(row.project_id, set);
  }

  return projects.map((project) => ({
    ...project,
    contract_type: Array.from(typesByProjectId.get(project.id) ?? []),
  }));
}

export const createSupabaseMatriceClient = (supabase: SupabaseClient): MatriceApiClient => ({
  async getActivities() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('sort_order');
    if (error) throw new Error(error.message);
    return (data ?? []) as Activity[];
  },

  async getPhases() {
    const { data, error } = await supabase
      .from('matrice_phases')
      .select('*')
      .order('sort_order');
    if (error) throw new Error(error.message);
    return (data ?? []) as MatricePhase[];
  },

  async getDependencies() {
    const { data, error } = await supabase
      .from('matrice_activity_dependencies')
      .select('*');
    if (error) throw new Error(error.message);
    return (data ?? []) as ActivityDependency[];
  },

  async getCells(projectIds) {
    if (projectIds.length === 0) return [];
    const { data, error } = await supabase
      .from('project_activity_status')
      .select('project_id, activity_id, status, note, expires_at')
      .in('project_id', projectIds);
    if (error) throw new Error(error.message);
    return (data ?? []) as MatrixCell[];
  },

  async getProjects(projectIds) {
    if (projectIds.length === 0) return [];
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, project_type')
      .in('id', projectIds)
      .order('id');
    if (error) throw new Error(error.message);
    return attachUnionedContractTypes(supabase, (data ?? []) as Omit<MatrixProject, 'contract_type'>[]);
  },

  async getAllProjects() {
    const { data, error } = await supabase
      .from('projects')
      // Residential contracts have no Matrice coverage — excluded so the
      // picker doesn't show empty/all-N/A rows for them.
      .select('id, name, project_type')
      .eq('project_category', 'industrial')
      .order('name');
    if (error) throw new Error(error.message);
    return attachUnionedContractTypes(supabase, (data ?? []) as Omit<MatrixProject, 'contract_type'>[]);
  },

  async setCellStatus(projectId, activityId, status, userId, expiresAt) {
    const { error } = await supabase
      .from('project_activity_status')
      .upsert(
        {
          project_id: projectId,
          activity_id: activityId,
          status,
          updated_by: userId,
          updated_at: new Date().toISOString(),
          ...(expiresAt !== undefined ? { expires_at: expiresAt } : {}),
        },
        { onConflict: 'project_id,activity_id' },
      );
    if (error) {
      if (error.hint === 'unmet_dependency') throw new DependencyError(error.message);
      throw new Error(error.message);
    }
  },
});
