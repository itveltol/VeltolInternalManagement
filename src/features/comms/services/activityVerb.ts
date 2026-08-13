import type { ActivityEvent, ActivityVerb } from "../types";

// Maps a verb string ("project.phase_changed") to its i18n leaf key
// ("project_phase_changed") under comms.feed.verb — dots aren't valid
// next-intl key segments the way underscore-joined leaves are.
export function verbTranslationKey(verb: ActivityVerb | string): string {
  return verb.replace(/\./g, "_");
}

// Verb groups drive the feed's "event type" filter — coarser than the verb
// itself (all project.* collapse to "project"), matching the module's
// five trigger sources.
export type VerbGroup = "project" | "matrice" | "situation" | "document" | "vacation";

export function verbGroup(verb: ActivityVerb | string): VerbGroup | null {
  const prefix = verb.split(".")[0];
  if (prefix === "project") return "project";
  if (prefix === "matrice") return "matrice";
  if (prefix === "situation") return "situation";
  if (prefix === "document") return "document";
  if (prefix === "vacation") return "vacation";
  return null;
}

// Render params for a single event's summary, ready to hand to next-intl's
// t(key, params). Falls back to empty strings for missing fields rather
// than throwing — a summary shape drifting from a verb is a data problem,
// not a reason to crash the feed.
export function verbParams(event: ActivityEvent): Record<string, string> {
  const s = event.summary ?? {};
  const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
  return {
    entityName: str(s.entityName),
    activityName: str(s.activityName),
    old: str(s.old),
    new: str(s.new),
  };
}

export function actorDisplayName(
  actor: { first_name: string | null; last_name: string | null } | null,
  systemLabel: string,
): string {
  if (!actor) return systemLabel;
  const name = [actor.first_name, actor.last_name].filter(Boolean).join(" ");
  return name || systemLabel;
}
