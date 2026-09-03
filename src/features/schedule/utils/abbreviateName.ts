/** "Kovacs Lorand" -> "K.Lorand" — first-name initial + full last name, for compact member chips on schedule cards. */
export function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0];
  const first = parts[0][0]?.toUpperCase() ?? "";
  const last = parts.slice(1).join(" ");
  return `${first}.${last}`;
}
