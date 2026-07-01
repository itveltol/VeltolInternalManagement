import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic();

interface ChecklistItem {
  number: number;
  activitate: string;
  cod: string;
}

interface ActivityItem {
  id: number;
  name: string;
  phase_name: string;
}

interface ChecklistSuggestion {
  itemNumber: number;
  plan_total: number;
}

interface MatriceSuggestion {
  activityId: number;
  status: "finalizat" | "in_progres";
}

function buildPrompt(
  fileNames: string[],
  checklistItems: ChecklistItem[],
  activities: ActivityItem[],
): string {
  const files = fileNames.join("\n");
  const checklist = checklistItems
    .map((i) => `${i.number}. [${i.cod}] ${i.activitate}`)
    .join("\n");
  const acts = activities
    .map((a) => `${a.id}. [${a.phase_name}] ${a.name}`)
    .join("\n");

  return `You are helping classify OneDrive folder contents for a Romanian renewable energy construction project.

FOLDER CONTENTS (file and folder names):
${files}

CHECKLIST ITEMS (construction activities, match by name similarity):
${checklist}

MATRIX ACTIVITIES (project phase activities, match by name similarity):
${acts}

Instructions:
- For each checklist item you are confident IS represented by one or more file/folder names above, include it in checklistSuggestions with plan_total: 1
- For each matrix activity: if files clearly indicate it is done/completed set status "finalizat"; if files indicate it is in progress set "in_progres"
- Only include items where you have moderate-to-high confidence
- Use Romanian language context when interpreting file names
- Reply with ONLY a raw JSON object — no markdown fences, no explanation

Required output format:
{"checklistSuggestions":[{"itemNumber":2,"plan_total":1}],"matriceSuggestions":[{"activityId":5,"status":"finalizat"}]}`;
}

function parseJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return {};
  }
}

function toChecklistSuggestions(raw: unknown): ChecklistSuggestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is ChecklistSuggestion =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as Record<string, unknown>).itemNumber === "number" &&
      typeof (r as Record<string, unknown>).plan_total === "number",
  );
}

function toMatriceSuggestions(raw: unknown): MatriceSuggestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is MatriceSuggestion =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as Record<string, unknown>).activityId === "number" &&
      ((r as Record<string, unknown>).status === "finalizat" ||
        (r as Record<string, unknown>).status === "in_progres"),
  );
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-veltol-ai") !== "1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let fileNames: string[];
  let checklistItems: ChecklistItem[];
  let activities: ActivityItem[];

  try {
    const body = await req.json();
    fileNames = body.fileNames ?? [];
    checklistItems = body.checklistItems ?? [];
    activities = body.activities ?? [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!fileNames.length) {
    return NextResponse.json({ error: "No file names provided" }, { status: 400 });
  }

  try {
    const prompt = buildPrompt(fileNames, checklistItems, activities);

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    const parsed = parseJson(rawText);

    return NextResponse.json({
      checklistSuggestions: toChecklistSuggestions(parsed.checklistSuggestions),
      matriceSuggestions: toMatriceSuggestions(parsed.matriceSuggestions),
    });
  } catch (err) {
    console.error("[ai/folder-scan]", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
