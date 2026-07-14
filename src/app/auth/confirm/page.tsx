"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/core/supabase/client";
import { defaultLocale, locales } from "@/i18n/config";

// This page is exempt from the locale-prefix middleware (it's an auth callback,
// not app content), so it must resolve the user's already-chosen locale itself
// instead of hardcoding defaultLocale — otherwise it silently overrides a prior
// language switch that's only recorded in the NEXT_LOCALE cookie.
function currentLocale(): string {
  const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/);
  const cookieLocale = match ? decodeURIComponent(match[1]) : null;
  return cookieLocale && (locales as readonly string[]).includes(cookieLocale)
    ? cookieLocale
    : defaultLocale;
}

// Supabase sends invite tokens as a hash fragment (#access_token=...&type=invite).
// Hash fragments are never sent to the server, so a Route Handler cannot read them.
// This client page reads the fragment, establishes the session, then redirects.
export default function ConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.slice(1); // strip leading #
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    const locale = currentLocale();

    if (!accessToken || !refreshToken) {
      router.replace(`/${locale}/login?error=missing_token`);
      return;
    }

    const supabase = createClient();

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          router.replace(`/${locale}/login?error=invalid_token`);
          return;
        }
        // Invite → user needs to complete registration (name, phone, password)
        if (type === "invite") {
          router.replace(`/${locale}/register`);
        } else {
          router.replace(`/${locale}/dashboard`);
        }
      });
  }, [router]);

  return null;
}
