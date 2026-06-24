import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createRecord, listRecords, resolveCollectionOrThrow } from "@/lib/admin/content-store";
import type { AdminRecord } from "@/lib/admin/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ collection: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { collection } = await context.params;
    const config = resolveCollectionOrThrow(collection);
    const result = await listRecords(config.key);
    return NextResponse.json({
      config,
      ...result
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load collection." }, { status: 400 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = requireAdmin(request, { mutate: true });
  if (!auth.ok) return auth.response;

  try {
    const { collection } = await context.params;
    const config = resolveCollectionOrThrow(collection);
    const body = (await request.json()) as Partial<AdminRecord>;
    const result = await createRecord(config.key, body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create record." }, { status: 400 });
  }
}
