// Supabase itself has no per-login session length — its refresh token has one
// project-wide lifetime. This cookie lets the app enforce a shorter, app-level
// expiry for users who didn't check "remember me": the proxy reads it on every
// request and force-signs-out once it's stale, even though the underlying
// Supabase session is still technically valid.
export const SESSION_META_COOKIE = "session_meta";
export const UNREMEMBERED_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionMeta = {
  startedAt: number;
  remember: boolean;
};

export function encodeSessionMeta(meta: SessionMeta): string {
  return encodeURIComponent(JSON.stringify(meta));
}

export function parseSessionMeta(raw: string | undefined): SessionMeta | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (
      typeof parsed?.startedAt === "number" &&
      typeof parsed?.remember === "boolean"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function isSessionExpired(meta: SessionMeta | null): boolean {
  if (!meta) return false;
  if (meta.remember) return false;
  return Date.now() - meta.startedAt > UNREMEMBERED_SESSION_MAX_AGE_MS;
}
