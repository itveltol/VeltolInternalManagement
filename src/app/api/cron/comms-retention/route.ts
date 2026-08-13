import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/core/supabase/admin";
import { ACTIVITY_EVENTS_RETENTION_DAYS } from "@/features/comms/constants";

// Prunes activity_events older than the retention window (module plan
// §3.6: 12 months from day one). Never touches `notes` — human-written
// content is kept indefinitely; only the machine-generated log is pruned.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("comms-retention: CRON_SECRET is not set — refusing to run.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - ACTIVITY_EVENTS_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error, count } = await supabase
    .from("activity_events")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  if (error) {
    console.error("comms-retention: delete failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const deleted = count ?? 0;
  console.log(`comms-retention: removed ${deleted} activity_events row(s) older than ${cutoff}`);
  return NextResponse.json({ deleted, cutoff });
}
