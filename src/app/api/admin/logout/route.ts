import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request, { mutate: true });
  if (!auth.ok) return auth.response;

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
