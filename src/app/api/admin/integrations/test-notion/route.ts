import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { testNotionConnections } from "@/lib/admin/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request, { mutate: true });
  if (!auth.ok) return auth.response;

  return NextResponse.json({ results: await testNotionConnections() });
}
