"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/core/supabase/client";
import { defaultLocale } from "@/i18n/config";

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

    if (!accessToken || !refreshToken) {
      router.replace(`/${defaultLocale}/login?error=missing_token`);
      return;
    }

    const supabase = createClient();

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          router.replace(`/${defaultLocale}/login?error=invalid_token`);
          return;
        }
        // Invite → user needs to complete registration (name, phone, password)
        if (type === "invite") {
          router.replace(`/${defaultLocale}/register`);
        } else {
          router.replace(`/${defaultLocale}/dashboard`);
        }
      });
  }, [router]);

  return null;
}
