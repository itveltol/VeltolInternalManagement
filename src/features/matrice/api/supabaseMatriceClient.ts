import type { SupabaseClient } from '@supabase/supabase-js';
import type { MatriceApiClient } from './types';
import type { Activity, MatrixCell, MatrixProject, ActivityStatus } from '../types';

export const createSupabaseMatriceClient = (supabase: SupabaseClient): MatriceApiClient => ({
  async getActivities() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('sort_order');
    if (error) throw new Error(error.message);
    return (data ?? []) as Activity[];
  },

  async getCells(projectIds) {
    if (projectIds.length === 0) return [];
    const { data, error } = await supabase
      .from('project_activity_status')
      .select('project_id, activity_id, status, note')
      .in('project_id', projectIds);
    if (error) throw new Error(error.message);
    return (data ?? []) as MatrixCell[];
  },

  async getProjects(projectIds) {
    if (projectIds.length === 0) return [];
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, project_type, contract_type')
      .in('id', projectIds)
      .order('id');
    if (error) throw new Error(error.message);
    return (data ?? []) as MatrixProject[];
  },

  async getAllProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, project_type, contract_type')
      .order('name');
    if (error) throw new Error(error.message);
    return (data ?? []) as MatrixProject[];
  },

  async setCellStatus(projectId, activityId, status, userId) {
    const { error } = await supabase
      .from('project_activity_status')
      .upsert(
        { project_id: projectId, activity_id: activityId, status, updated_by: userId, updated_at: new Date().toISOString() },
        { onConflict: 'project_id,activity_id' },
      );
    if (error) throw new Error(error.message);
  },
});
