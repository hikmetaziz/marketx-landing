import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/** Supabase bərpa linki səhvən ana səhifəyə düşəndə /reset-password-ə yönləndir. */
function redirectRecoveryParamsToResetPassword(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/reset-password" || pathname.startsWith("/auth/")) {
    return null;
  }

  const hasCode = searchParams.has("code");
  const hasAuthError =
    searchParams.has("error") ||
    searchParams.has("error_code") ||
    searchParams.has("error_description");

  if (!hasCode && !hasAuthError) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/reset-password";
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const recoveryRedirect = redirectRecoveryParamsToResetPassword(request);
  if (recoveryRedirect) {
    return recoveryRedirect;
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
