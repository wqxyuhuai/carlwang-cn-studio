import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteRecord, resolveCollectionOrThrow, updateRecord } from "@/lib/admin/content-store";
import type { AdminRecord } from "@/lib/admin/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ collection: string; id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireAdmin(request, { mutate: true });
  if (!auth.ok) return auth.response;

  try {
    const { collection, id } = await context.params;
    const config = resolveCollectionOrThrow(collection);
    const body = (await request.json()) as Partial<AdminRecord>;
    const result = await updateRecord(config.key, id, body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update record." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = requireAdmin(request, { mutate: true });
  if (!auth.ok) return auth.response;

  try {
    const { collection, id } = await context.params;
    const config = resolveCollectionOrThrow(collection);
    const result = await deleteRecord(config.key, id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete record." }, { status: 400 });
  }
}
