// activity_events retention (module plan §3.6, §Phase 3): 12 months from
// day one, not "later". Human-written content (notes) is never
// auto-deleted — only this machine-generated log is pruned. Kept as a
// named constant so the cron and any future admin tooling share one
// number instead of a literal duplicated across files.
export const ACTIVITY_EVENTS_RETENTION_DAYS = 365;
