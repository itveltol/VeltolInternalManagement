import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { locales, defaultLocale } from "@/i18n/config";
import {
  SESSION_META_COOKIE,
  isSessionExpired,
  parseSessionMeta,
} from "@/core/supabase/sessionMeta";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SUPABASE_READY =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 0;

const intlMiddleware = createMiddleware(routing);

function getLocaleFromPathname(pathname: string): string | null {
  const segment = pathname.split("/")[1];
  return (locales as readonly string[]).includes(segment) ? segment : null;
}

// Redirects must carry over any Set-Cookie already accumulated on `base`
// (next-intl's NEXT_LOCALE sync, Supabase's refreshed session cookies) —
// NextResponse.redirect() on its own creates a fresh response with none of them.
function redirectPreservingCookies(base: NextResponse, url: URL) {
  const redirect = NextResponse.redirect(url);
  base.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and auth callback
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next({ request });
  }

  // Run next-intl middleware so it sets the locale on the request/response
  const intlResponse = intlMiddleware(request);

  // If next-intl issued a redirect (e.g. missing locale prefix), honour it
  if (intlResponse.status !== 200) {
    return intlResponse;
  }

  // Resolve locale from the path (at this point it's always present)
  const locale = getLocaleFromPathname(pathname) ?? defaultLocale;

  const pathnameWithoutLocale = pathname.replace(`/${locale}`, "") || "/";
  const isLoginPage = pathnameWithoutLocale === "/login";
  const isRegisterPage = pathnameWithoutLocale === "/register";
  const isRoot = pathnameWithoutLocale === "/";

  // Start from the intl response so its headers (x-intl-locale etc.) and any
  // Set-Cookie it already issued (NEXT_LOCALE sync) are kept
  const response = intlResponse;

  if (SUPABASE_READY) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user: authedUser },
    } = await supabase.auth.getUser();

    // Supabase's refresh token has one project-wide lifetime with no
    // per-login "remember me" concept. Enforce a shorter, app-level expiry
    // here for anyone who didn't check it: once stale, treat the request as
    // signed out and drop the still-valid Supabase cookies.
    const sessionMeta = parseSessionMeta(
      request.cookies.get(SESSION_META_COOKIE)?.value
    );
    const sessionExpired = !!authedUser && isSessionExpired(sessionMeta);
    if (sessionExpired) {
      await supabase.auth.signOut();
      response.cookies.delete(SESSION_META_COOKIE);
    }
    const user = sessionExpired ? null : authedUser;

    let needsRegistration = false;
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("registered_at")
        .eq("id", user.id)
        .single();
      // Fail open: if the lookup errors (e.g. stale PostgREST schema cache),
      // don't lock existing users out of the whole app.
      needsRegistration = !profileError && !profile?.registered_at;
    }

    if (isRoot) {
      const url = request.nextUrl.clone();
      url.pathname = !user
        ? `/${locale}/login`
        : needsRegistration
          ? `/${locale}/register`
          : `/${locale}/dashboard`;
      return redirectPreservingCookies(response, url);
    }

    if (user && isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = needsRegistration ? `/${locale}/register` : `/${locale}/dashboard`;
      return redirectPreservingCookies(response, url);
    }

    if (user && needsRegistration && !isRegisterPage) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/register`;
      return redirectPreservingCookies(response, url);
    }

    if (user && !needsRegistration && isRegisterPage) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/dashboard`;
      return redirectPreservingCookies(response, url);
    }

    const isPublic = isLoginPage;
    if (!user && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      return redirectPreservingCookies(response, url);
    }
  } else if (isRoot) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return redirectPreservingCookies(response, url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
