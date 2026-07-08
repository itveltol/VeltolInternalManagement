import { Resend } from "resend";

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

// RESEND_FROM_EMAIL requires a domain verified in Resend. Until one is set up,
// invite emails are skipped and the caller falls back to showing credentials
// for manual delivery.
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendEmail({ to, subject, html }: SendEmailPayload): Promise<void> {
  if (!isEmailConfigured()) throw new Error("Email sending is not configured");

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject,
    html,
  });
  if (error) throw new Error(error.message);
}
