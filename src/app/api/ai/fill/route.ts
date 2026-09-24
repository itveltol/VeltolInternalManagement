import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/core/supabase/session";
import {
  MAX_FILE_SIZE,
  MIME_TYPES,
  extractFieldsFromFile,
  suggestFieldsFromContext,
  type FormType,
  type Locale,
} from "@/core/ai/extractFormFields";

export async function POST(req: NextRequest) {
  const { user } = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      if (fileEntry.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "File too large" }, { status: 413 });
      }
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
    let suggestions: Record<string, string>;

    if (file) {
      const mimeType = file.type || "application/octet-stream";

      if (!MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${mimeType}` },
          { status: 400 },
        );
      }

      suggestions = await extractFieldsFromFile({
        content: await file.arrayBuffer(),
        name: file.name,
        mimeType,
        formType,
        targetFields,
        context,
        locale,
      });
    } else {
      suggestions = await suggestFieldsFromContext(formType, context, targetFields, locale);
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[ai/fill]", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
