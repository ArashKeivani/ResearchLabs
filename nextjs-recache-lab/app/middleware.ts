import { NextRequest, NextResponse } from "next/server";

// Intentionally vulnerable lab behavior:
// reflect request headers into response headers. This mirrors only the relevant/observable
// headers rather than leaking cookies, authorization, hop-by-hop, or proxy-controlled headers.
// In particular, Content-Type can change an RSC response's interpretation, and Refresh can
// be persisted by the lab's deliberately misconfigured shared cache.
const EXCLUDED_PREFIXES = ["sec-", "proxy-", "x-forwarded-"];
const EXCLUDED_HEADERS = new Set([
  "host",
  "content-length",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "cookie",
  "authorization",
  "accept-encoding"
]);

export function middleware(request: NextRequest) {
  const reflectedHeaders = new Headers();

  for (const [name, value] of request.headers.entries()) {
    const lowerName = name.toLowerCase();
    if (EXCLUDED_HEADERS.has(lowerName)) continue;
    if (EXCLUDED_PREFIXES.some((prefix) => lowerName.startsWith(prefix))) continue;
    reflectedHeaders.set(name, value);
  }

  return NextResponse.next({ headers: reflectedHeaders });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
