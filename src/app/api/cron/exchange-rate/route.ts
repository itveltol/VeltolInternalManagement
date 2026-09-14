import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/core/supabase/admin";
import { createSupabaseExchangeRatesClient } from "@/features/exchangeRates/api/supabaseExchangeRatesClient";
import { getTodaysRate } from "@/features/exchangeRates/services/exchangeRateService";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("exchange-rate: CRON_SECRET is not set — refusing to run.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const client = createSupabaseExchangeRatesClient(supabase);
  const rate = await getTodaysRate(client);

  return NextResponse.json({ rate });
}
