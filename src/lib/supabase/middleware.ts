import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const AUTH_PATH_PREFIXES = ["/admin", "/account", "/elan-yarat", "/create-listing", "/auth"] as const;
const AUTH_EXACT_PATHS = new Set(["/login", "/reset-password"]);

function isAuthSensitivePath(pathname: string): boolean {
  if (AUTH_EXACT_PATHS.has(pathname)) {
    return true;
  }

  return AUTH_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("auth"));
}

function clearSupabaseSessionCookies(request: NextRequest, response: NextResponse) {
  request.cookies.getAll().forEach(({ name }) => {
    if (!name.startsWith("sb-")) {
      return;
    }

    request.cookies.delete(name);
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
    });
  });
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!isAuthSensitivePath(pathname) && !hasSupabaseSessionCookie(request)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.getUser();
  if (error) {
    clearSupabaseSessionCookies(request, supabaseResponse);
  }

  return supabaseResponse;
}
