import { Resend } from "resend";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends one transactional email through Resend. Best-effort: returns false
 * (never throws) when Resend isn't configured or the send fails, so callers
 * can fire it alongside a save without guarding it themselves.
 */
export async function sendEmail({ to, subject, html }: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return false;

  try {
    const { error } = await new Resend(apiKey).emails.send({ from: fromEmail, to, subject, html });
    if (error) {
      console.error(`sendEmail: send failed for ${to}`, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`sendEmail: send failed for ${to}`, e);
    return false;
  }
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes user-entered text (project/person names) before it goes into email HTML. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
