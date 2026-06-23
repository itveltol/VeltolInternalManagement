import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { locales, defaultLocale } from "@/i18n/config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SUPABASE_READY =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 0;

const intlMiddleware = createMiddleware(routing);

function getLocaleFromPathname(pathname: string): string | null {
  const segment = pathname.split("/")[1];
  return (locales as readonly string[]).includes(segment) ? segment : null;
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
  const isRoot = pathnameWithoutLocale === "/";

  // Start from the intl response so its headers (x-intl-locale etc.) are kept
  let response = intlResponse;

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isRoot) {
      const url = request.nextUrl.clone();
      url.pathname = user ? `/${locale}/dashboard` : `/${locale}/login`;
      return NextResponse.redirect(url);
    }

    if (user && isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/dashboard`;
      return NextResponse.redirect(url);
    }

    const isPublic = isLoginPage;
    if (!user && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      return NextResponse.redirect(url);
    }
  } else if (isRoot) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
