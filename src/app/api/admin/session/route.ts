import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasAdminAuthConfig } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  return NextResponse.json({
    authenticated: Boolean(session),
    configured: hasAdminAuthConfig(),
    csrf: session?.csrf || "",
    expiresAt: session ? new Date(session.exp * 1000).toISOString() : ""
  });
}
