import type { SupabaseClient } from '@supabase/supabase-js';
import type { DocumentsApiClient, GetDocumentsFilter } from './types';
import type { Document } from '../types';

export const createSupabaseDocumentsClient = (supabase: SupabaseClient): DocumentsApiClient => ({
  async getDocuments(filter = {}) {
    let query = supabase
      .from('documents')
      .select('*, creator:profiles!created_by(first_name, last_name), project:projects!project_id(id, name)')
      .order('created_at', { ascending: false });

    if (filter.project_id !== undefined) query = query.eq('project_id', filter.project_id);
    if (filter.linked_type)              query = query.eq('linked_type', filter.linked_type);
    if (filter.linked_id)                query = query.eq('linked_id', filter.linked_id);
    if (filter.search)                   query = query.ilike('name', `%${filter.search}%`);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Document[];
  },

  async getDocumentsByProject(projectId) {
    const { data, error } = await supabase
      .from('documents')
      .select('*, creator:profiles!created_by(first_name, last_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Document[];
  },

  async getDocumentsByLinkedId(linkedType, linkedId) {
    const { data, error } = await supabase
      .from('documents')
      .select('*, creator:profiles!created_by(first_name, last_name)')
      .eq('linked_type', linkedType)
      .eq('linked_id', linkedId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Document[];
  },

  async createDocument(payload) {
    const { data, error } = await supabase
      .from('documents')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: number }).id };
  },

  async deleteDocument(id) {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
});
