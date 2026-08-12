import type { CreateNotePayload, MentionCandidate, Note, NoteStatus, Notification } from "../types";

export interface NotesFilter {
  projectId?: number;
  activityId?: number;
  kind?: string;
  authorId?: string;
  unreadOnly?: boolean;
  openOnly?: boolean;
  personalOnly?: boolean;
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
}
