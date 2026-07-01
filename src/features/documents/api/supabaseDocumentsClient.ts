import type { SupabaseClient } from '@supabase/supabase-js';
import type { DocumentsApiClient, GetDocumentsFilter } from './types';
import type { Document, UpdateDocumentPayload } from '../types';

const DOCUMENT_SELECT = `
  *,
  creator:profiles!created_by(first_name, last_name),
  responsible:profiles!responsible_id(first_name, last_name),
  project:projects!project_id(id, name)
`;

export const createSupabaseDocumentsClient = (supabase: SupabaseClient): DocumentsApiClient => ({
  async getDocuments(filter = {}) {
    let query = supabase
      .from('documents')
      .select(DOCUMENT_SELECT)
      .order('created_at', { ascending: false });

    if (filter.project_id !== undefined) query = query.eq('project_id', filter.project_id);
    if (filter.linked_type)              query = query.eq('linked_type', filter.linked_type);
    if (filter.linked_id)                query = query.eq('linked_id', filter.linked_id);
    if (filter.search)                   query = query.ilike('name', `%${filter.search}%`);
    if (filter.category)                 query = query.eq('category', filter.category);
    if (filter.status)                   query = query.eq('status', filter.status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Document[];
  },

  async getDocumentsByProject(projectId) {
    const { data, error } = await supabase
      .from('documents')
      .select(DOCUMENT_SELECT)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Document[];
  },

  async getDocumentsByLinkedId(linkedType, linkedId) {
    const { data, error } = await supabase
      .from('documents')
      .select(DOCUMENT_SELECT)
      .eq('linked_type', linkedType)
      .eq('linked_id', linkedId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Document[];
  },

  async getResponsibleProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .order('first_name', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; first_name: string | null; last_name: string | null }[];
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

  async updateDocument(id, payload: UpdateDocumentPayload) {
    const { error } = await supabase
      .from('documents')
      .update(payload)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async deleteDocument(id) {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
});
