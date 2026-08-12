export type NoteKind = "note" | "announcement" | "question" | "decision" | "risk";
export type NoteVisibility = "private" | "team" | "project" | "company";
export type NoteStatus = "open" | "resolved" | "archived";
export type NoteColor = "accent" | "green" | "orange" | "red" | "primary";

export type NotificationType =
  | "mention"
  | "reply"
  | "ack_required"
  | "due_soon"
  | "aviz_expiring"
  | "maintenance_due"
  | "vacation_request"
  | "system";

export interface NoteAnchor {
  projectId?: number | null;
  activityId?: number | null;
  situationId?: number | null;
  clientId?: number | null;
  subcontractorId?: number | null;
  supplierId?: number | null;
  documentId?: number | null;
  teamId?: number | null;
  isPersonal?: boolean;
}

export interface NoteAuthor {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface Note {
  id: number;
  kind: NoteKind;
  title: string | null;
  body: string;
  color: NoteColor | null;
  author_id: string | null;
  author: NoteAuthor | null;
  visibility: NoteVisibility;
  status: NoteStatus;
  parent_id: number | null;
  due_date: string | null;
  requires_ack: boolean;
  ack_deadline: string | null;
  is_personal: boolean;
  project_id: number | null;
  project_name: string | null;
  activity_id: number | null;
  activity_name: string | null;
  situation_id: number | null;
  client_id: number | null;
  subcontractor_id: number | null;
  supplier_id: number | null;
  document_id: number | null;
  team_id: number | null;
  reply_count: number;
  unread: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteThread {
  root: Note;
  replies: Note[];
}

export interface NotePin {
  id: number;
  note_id: number;
  profile_id: string | null;
  pinned_by: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  profile_id: string;
  type: NotificationType;
  note_id: number | null;
  project_id: number | null;
  payload: {
    actorName?: string | null;
    projectName?: string | null;
    snippet?: string | null;
    noteKind?: NoteKind | null;
  };
  href: string | null;
  read_at: string | null;
  created_at: string;
}

export interface CreateNotePayload {
  kind: NoteKind;
  title?: string | null;
  body: string;
  color?: NoteColor | null;
  visibility: NoteVisibility;
  parentId?: number | null;
  dueDate?: string | null;
  requiresAck?: boolean;
  ackDeadline?: string | null;
  anchor: NoteAnchor;
}

export interface UpdateNoteStatusPayload {
  status: NoteStatus;
}

export interface MentionCandidate {
  id: string;
  handle: string;
}
