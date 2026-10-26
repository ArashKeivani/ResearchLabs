// Defensive example: do not reflect arbitrary request headers into response headers.
// Only forward request headers explicitly required by the downstream renderer, and use
// NextResponse.next({ request: { headers } }) for request-header forwarding.
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  // Remove any client-controlled headers that are not intended for the application.
  requestHeaders.delete("refresh");
  requestHeaders.delete("content-type");

  return NextResponse.next({ request: { headers: requestHeaders } });
}
