import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const AUTH_PAGES = new Set(["/auth/login", "/auth/register", "/auth/error", "/auth/verify"]);

function getSafeCallbackUrl(callbackUrl: string | null) {
  if (!callbackUrl) {
    return "/";
  }

  return callbackUrl.startsWith("/") ? callbackUrl : "/";
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthPage = AUTH_PAGES.has(pathname);

  if (!token && !isAuthPage) {
    const loginUrl = new URL("/auth/login", request.url);
    const callbackUrl = `${pathname}${search}`;

    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", callbackUrl);
    }

    return NextResponse.redirect(loginUrl);
  }

  if (token && (pathname === "/auth/login" || pathname === "/auth/register")) {
    const callbackUrl = getSafeCallbackUrl(request.nextUrl.searchParams.get("callbackUrl"));
    return NextResponse.redirect(new URL(callbackUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
