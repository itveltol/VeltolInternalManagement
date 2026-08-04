import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/core/supabase/admin";
import { createSupabaseExchangeRatesClient } from "@/features/exchangeRates/api/supabaseExchangeRatesClient";
import { getTodaysRate } from "@/features/exchangeRates/services/exchangeRateService";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const client = createSupabaseExchangeRatesClient(supabase);
  const rate = await getTodaysRate(client);

  return NextResponse.json({ rate });
}
