import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale } from "@/i18n/config";

// Prefix every public URL with a locale: "/" → "/bn", "/training" → "/bn/training".
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";

  if (hasLocale(firstSegment)) return;

  request.nextUrl.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Skip Next internals, API routes, the (future) non-localized admin CMS, and files with an extension.
  matcher: ["/((?!_next|api|admin|.*\\..*).*)"],
};
