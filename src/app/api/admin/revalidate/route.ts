import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request, { mutate: true });
  if (!auth.ok) return auth.response;

  revalidatePath("/", "layout");
  revalidatePath("/works", "page");
  revalidatePath("/about", "page");

  return NextResponse.json({ ok: true, revalidatedAt: new Date().toISOString() });
}
