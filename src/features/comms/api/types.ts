import type { ActivityEvent, AckReceipt, CreateNotePayload, MentionCandidate, Note, NoteStatus, Notification } from "../types";

export interface NotesFilter {
  projectId?: number;
  activityId?: number;
  kind?: string;
  authorId?: string;
  unreadOnly?: boolean;
  openOnly?: boolean;
  personalOnly?: boolean;
}

export interface ActivityEventFilter {
  projectId?: number;
  actorId?: string;
  verbPrefix?: string;
  from?: string;
  to?: string;
  /** Zero-based page range, applied via .range() — never fetch-all-then-slice. */
  page: number;
  pageSize: number;
}

export interface NotesPageFilter {
  projectId?: number;
  page: number;
  pageSize: number;
}

export interface CommsApiClient {
  getNotes(filter: NotesFilter): Promise<Note[]>;
  getNoteThread(rootId: number): Promise<Note[]>;
  createNote(authorId: string, payload: CreateNotePayload): Promise<{ id: number }>;
  insertMentions(noteId: number, profileIds: string[]): Promise<void>;
  setNoteStatus(noteId: number, status: NoteStatus): Promise<void>;
  deleteNote(noteId: number): Promise<void>;
  getMentionCandidates(): Promise<MentionCandidate[]>;
  getPersonalPinNoteIds(profileId: string): Promise<number[]>;
  getContextPinNoteIds(projectId: number): Promise<number[]>;
  setPersonalPin(noteId: number, profileId: string, pinned: boolean): Promise<void>;
  setContextPin(noteId: number, pinnedBy: string, pinned: boolean): Promise<void>;
  markSeen(noteIds: number[], profileId: string): Promise<void>;
  getNotifications(profileId: string): Promise<Notification[]>;
  markNotificationsRead(profileId: string, notificationIds?: number[]): Promise<void>;

  // Announcements (Phase 2)
  getAnnouncements(): Promise<Note[]>;
  getAnnouncement(noteId: number): Promise<Note | null>;
  previewAudience(scope: {
    visibility: string;
    projectId: number | null;
    teamId: number | null;
  }): Promise<number>;
  getAckReceipts(noteId: number): Promise<AckReceipt[]>;
  getOwnReceipt(noteId: number, profileId: string): Promise<{ acknowledgedAt: string | null } | null>;
  acknowledge(noteId: number, profileId: string): Promise<void>;
  sendAckReminder(noteId: number): Promise<{ notified: number }>;
  getAckCounts(noteIds: number[]): Promise<Map<number, { total: number; acknowledged: number }>>;
  getOwnReceipts(noteIds: number[], profileId: string): Promise<Map<number, { acknowledgedAt: string | null }>>;

  // Activity feed (Phase 3)
  getActivityEvents(filter: ActivityEventFilter): Promise<{ events: ActivityEvent[]; hasMore: boolean }>;
  getNotesPage(filter: NotesPageFilter): Promise<{ notes: Note[]; hasMore: boolean }>;
}
