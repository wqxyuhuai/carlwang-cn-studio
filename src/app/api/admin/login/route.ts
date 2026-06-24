import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, hasAdminAuthConfig, setSessionCookie, verifyAdminPassword } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { password?: string };

  if (!hasAdminAuthConfig()) {
    return NextResponse.json(
      {
        error: "Admin auth is not configured. Set ADMIN_PASSWORD_HASH and a 32+ character ADMIN_SESSION_SECRET."
      },
      { status: 503 }
    );
  }

  const result = await verifyAdminPassword(request, String(body.password || ""));
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 401 });
  }

  const token = createSessionToken();
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, token);
  return response;
}
