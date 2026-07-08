import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/core/supabase/server";
import { defaultLocale } from "@/i18n/config";

// Supabase's invite/magiclink/recovery emails point here with the verification
// token as query params (?token_hash=...&type=...), not a hash fragment.
// Query params survive redirects, copy-paste, and cross-device delivery, so the
// session can be established server-side before the user ever leaves this route.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/${defaultLocale}/login?error=missing_token`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    return NextResponse.redirect(`${origin}/${defaultLocale}/login?error=invalid_token`);
  }

  const destination = type === "invite" ? "register" : "dashboard";
  return NextResponse.redirect(`${origin}/${defaultLocale}/${destination}`);
}
