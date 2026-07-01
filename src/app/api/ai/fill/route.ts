import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic();

type FormType = "client" | "project";
type Locale = "en" | "hu" | "ro";

const MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

const FIELD_DESCRIPTIONS: Record<string, string> = {
  // client — company
  cui: "CUI/CIF (Romanian company tax ID, format: RO followed by 7-10 digits)",
  j_number: "J-number (trade register number, format: J{county_code}/{number}/{year}, e.g. J40/123/2020)",
  legal_rep: "Legal representative (full name of the person legally representing the company)",
  // client — person
  cnp: "CNP (personal numeric code, exactly 13 digits)",
  id_series: "ID series (2 uppercase letters from the identity card)",
  id_number: "ID number (6 digits from the identity card)",
  // shared
  reg_address: "Registered/legal address (full street address, city, county)",
  contact_person: "Contact person (full name of the operational contact)",
  email: "Email address",
  phone: "Phone number (Romanian format, e.g. +40 700 000 000)",
  notes: "Additional notes",
  // project
  county: "Romanian county name (județ)",
  site_location: "Site location (village and/or commune)",
  project_type: "Project type (e.g. CEF cu BESS, Parc fotovoltaic, BESS standalone)",
  name: "Project name (usually the company or site name)",
  contract_number: "Contract number (numeric or alphanumeric identifier)",
  mw_solar: "Installed solar capacity in megawatts (decimal number)",
  mw_bess: "Installed BESS capacity in megawatts (decimal number)",
};

function buildTextPrompt(
  formType: FormType,
  context: Record<string, string>,
  targetFields: string[],
  locale: Locale,
): string {
  const fieldList = targetFields
    .map((f) => `- ${f}: ${FIELD_DESCRIPTIONS[f] ?? f}`)
    .join("\n");

  const contextStr = Object.entries(context)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const formDesc =
    formType === "client"
      ? "Romanian business client registration form (company or natural person under Romanian law)"
      : "Romanian renewable energy project registration form";

  return `You are filling in a ${formDesc}.

Known information:
${contextStr}

Fill ONLY these fields (return nothing else):
${fieldList}

Rules:
- Use realistic Romanian data matching the context
- For company fields: use proper Romanian formats (CUI starts with RO, J-number follows J{code}/{seq}/{year})
- For person fields: CNP is exactly 13 digits, ID series is 2 uppercase letters, ID number is 6 digits
- Phone numbers use +40 prefix
- Language for text values: ${locale}
- If you cannot confidently infer a field, return an empty string "" for it
- Reply with a raw JSON object ONLY — no markdown fences, no explanation

Example output format: {"reg_address": "Str. Libertății nr. 12, Cluj-Napoca", "email": "contact@example.ro"}`;
}

function buildFilePrompt(
  formType: FormType,
  context: Record<string, string>,
  targetFields: string[],
  locale: Locale,
): string {
  const fieldList = targetFields
    .map((f) => `- ${f}: ${FIELD_DESCRIPTIONS[f] ?? f}`)
    .join("\n");

  const contextStr =
    Object.keys(context).length > 0
      ? `\nAdditional known context:\n${Object.entries(context)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")}`
      : "";

  const formDesc =
    formType === "client"
      ? "Romanian business client registration form (company or natural person under Romanian law)"
      : "Romanian renewable energy project registration form";

  return `Extract data from the attached document to fill in a ${formDesc}.${contextStr}

Extract ONLY these fields:
${fieldList}

Rules:
- Extract data exactly as it appears in the document when possible
- For Romanian formats: preserve them (CUI with RO prefix, J-number format, CNP 13 digits, etc.)
- If a field is not present in the document, return "" for it
- Language for text values: ${locale}
- Reply with a raw JSON object ONLY — no markdown fences, no explanation`;
}

function sanitize(
  raw: Record<string, unknown>,
  targetFields: string[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of targetFields) {
    if (typeof raw[field] === "string") {
      result[field] = raw[field] as string;
    }
  }
  return result;
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

export async function POST(req: NextRequest) {
  if (req.headers.get("x-veltol-ai") !== "1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  let formType: FormType;
  let context: Record<string, string>;
  let targetFields: string[];
  let locale: Locale;
  let file: File | null = null;

  if (isMultipart) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    formType = (formData.get("formType") as FormType) ?? "client";
    locale = (formData.get("locale") as Locale) ?? "en";

    try {
      context = JSON.parse((formData.get("context") as string) ?? "{}");
      targetFields = JSON.parse((formData.get("targetFields") as string) ?? "[]");
    } catch {
      return NextResponse.json({ error: "Invalid JSON fields" }, { status: 400 });
    }

    const fileEntry = formData.get("file");
    if (fileEntry instanceof File && fileEntry.size > 0) {
      file = fileEntry;
    }
  } else {
    try {
      const body = await req.json();
      formType = body.formType ?? "client";
      context = body.context ?? {};
      targetFields = body.targetFields ?? [];
      locale = body.locale ?? "en";
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  if (!targetFields.length) {
    return NextResponse.json({ error: "No target fields specified" }, { status: 400 });
  }

  try {
    let rawText: string;

    if (file) {
      const mimeType = file.type || "application/octet-stream";

      if (!MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${mimeType}` },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const fileBlob = await toFile(Buffer.from(arrayBuffer), file.name, { type: mimeType });

      const uploaded = await (anthropic.beta.files as any).upload(
        { file: fileBlob },
        { headers: { "anthropic-beta": "files-api-2025-04-14" } },
      );

      const fileId: string = uploaded.id;
      const isImage = IMAGE_TYPES.has(mimeType);

      const contentBlock = isImage
        ? { type: "image" as const, source: { type: "file" as const, file_id: fileId } }
        : {
            type: "document" as const,
            source: { type: "file" as const, file_id: fileId },
          };

      const prompt = buildFilePrompt(formType, context, targetFields, locale);

      const response = await (anthropic.beta.messages as any).create(
        {
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [contentBlock, { type: "text", text: prompt }],
            },
          ],
        },
        { headers: { "anthropic-beta": "files-api-2025-04-14" } },
      );

      rawText =
        response.content[0]?.type === "text" ? response.content[0].text : "";

      // Clean up uploaded file to avoid accumulation
      try {
        await (anthropic.beta.files as any).delete(fileId, {
          headers: { "anthropic-beta": "files-api-2025-04-14" },
        });
      } catch {
        // Non-fatal
      }
    } else {
      const prompt = buildTextPrompt(formType, context, targetFields, locale);

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });

      rawText =
        response.content[0]?.type === "text" ? response.content[0].text : "";
    }

    const parsed = parseJson(rawText);
    const suggestions = sanitize(parsed, targetFields);

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[ai/fill]", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
