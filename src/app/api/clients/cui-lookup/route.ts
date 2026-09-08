import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/core/supabase/session";
import { lookupCompanyByCui } from "@/features/clients/services/anafService";

const CUI_RE = /^RO?(\d{7,10})$/i;

export async function POST(req: NextRequest) {
  const { user } = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let cui: string;
  try {
    const body = await req.json();
    cui = typeof body?.cui === "string" ? body.cui.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const match = CUI_RE.exec(cui);
  if (!match) {
    return NextResponse.json({ error: "Invalid CUI format" }, { status: 400 });
  }

  try {
    const company = await lookupCompanyByCui(match[1]);
    return NextResponse.json({ company });
  } catch (err) {
    console.error("[clients/cui-lookup]", err);
    return NextResponse.json({ error: "CUI lookup failed" }, { status: 502 });
  }
}
