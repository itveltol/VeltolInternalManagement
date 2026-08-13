import type { MentionCandidate } from "../types";

// @handle: word chars, dots, underscores, hyphens — stops before punctuation
// or whitespace, and never matches the @ inside an email address because
// that @ is preceded by a word character rather than by whitespace/start.
const MENTION_PATTERN = /(?<=^|\s)@([a-zA-Z0-9._-]+)/g;

export function parseMentionHandles(body: string): string[] {
  const handles = new Set<string>();
  for (const match of body.matchAll(MENTION_PATTERN)) {
    handles.add(match[1].toLowerCase());
  }
  return Array.from(handles);
}

export function resolveMentionedProfileIds(
  body: string,
  candidates: MentionCandidate[],
  authorId: string,
): string[] {
  const handles = new Set(parseMentionHandles(body));
  if (handles.size === 0) return [];

  const profileIds = new Set<string>();
  for (const candidate of candidates) {
    if (handles.has(candidate.handle.toLowerCase()) && candidate.id !== authorId) {
      profileIds.add(candidate.id);
    }
  }
  return Array.from(profileIds);
}
