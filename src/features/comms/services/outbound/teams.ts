// Microsoft Teams incoming-webhook outbound channel.
//
// Only two triggers ever call into this module: a published `announcement`
// and `aviz_expiring`. A channel that receives every note becomes a channel
// nobody reads (PLAN §8) — do not add more call sites here.
//
// Architecture rule: this is called from a server action or cron route,
// after the underlying transaction has already committed — never from a
// Postgres trigger (no HTTP from Postgres without extensions, and a failing
// webhook must never roll back a saved note). Callers must wrap calls in
// try/catch and log failures; a webhook error must never surface as a
// failed user action.

export interface AdaptiveCardInput {
  title: string;
  author: string | null;
  projectName: string | null;
  snippet: string;
  href: string;
}

export interface AdaptiveCardPayload {
  type: "message";
  attachments: {
    contentType: "application/vnd.microsoft.card.adaptive";
    content: {
      type: "AdaptiveCard";
      version: "1.4";
      $schema: string;
      body: Record<string, unknown>[];
      actions: Record<string, unknown>[];
    };
  }[];
}

const APP_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export function buildAdaptiveCard(input: AdaptiveCardInput): AdaptiveCardPayload {
  const facts: { title: string; value: string }[] = [];
  if (input.author) facts.push({ title: "Author", value: input.author });
  if (input.projectName) facts.push({ title: "Project", value: input.projectName });

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          type: "AdaptiveCard",
          version: "1.4",
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          body: [
            { type: "TextBlock", text: input.title, weight: "Bolder", size: "Medium", wrap: true },
            ...(facts.length > 0 ? [{ type: "FactSet", facts }] : []),
            { type: "TextBlock", text: input.snippet, wrap: true, isSubtle: true },
          ],
          actions: [
            {
              type: "Action.OpenUrl",
              title: "Open",
              url: APP_BASE_URL ? `${APP_BASE_URL}${input.href}` : input.href,
            },
          ],
        },
      },
    ],
  };
}

async function postToTeams(payload: AdaptiveCardPayload): Promise<void> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) return; // Feature disabled — silently and cleanly a no-op.

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Teams webhook responded with ${response.status}`);
  }
}

export async function postAnnouncementCard(input: {
  title: string;
  author: string;
  projectName: string | null;
  snippet: string;
  noteId: number;
}): Promise<void> {
  const card = buildAdaptiveCard({
    title: `📢 ${input.title}`,
    author: input.author,
    projectName: input.projectName,
    snippet: input.snippet,
    href: `/announcements/${input.noteId}`,
  });
  await postToTeams(card);
}

export async function postAvizExpiringCard(input: {
  projectName: string;
  activityName: string;
  expiresAt: string;
}): Promise<void> {
  const card = buildAdaptiveCard({
    title: `⚠️ Aviz expiring: ${input.activityName}`,
    author: null,
    projectName: input.projectName,
    snippet: `Expires ${input.expiresAt}`,
    href: `/matrice-status`,
  });
  await postToTeams(card);
}
