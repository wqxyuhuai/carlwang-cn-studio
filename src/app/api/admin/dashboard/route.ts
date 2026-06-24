import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getDashboardData } from "@/lib/admin/content-store";
import { getIntegrationStatus } from "@/lib/admin/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const [dashboard, integrations] = await Promise.all([getDashboardData(), getIntegrationStatus()]);
  return NextResponse.json({ ...dashboard, integrations });
}
