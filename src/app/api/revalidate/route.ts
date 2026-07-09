import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_CONTENT_CACHE_TAG } from "@/lib/cache-tags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasValidSecret(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("x-revalidate-secret") || request.nextUrl.searchParams.get("secret") || "";
  return provided === secret;
}

export async function POST(request: NextRequest) {
  if (!hasValidSecret(request)) {
    return NextResponse.json({ ok: false, error: "Invalid revalidate secret." }, { status: 401 });
  }

  revalidateTag(PUBLIC_CONTENT_CACHE_TAG, "max");
  revalidatePath("/", "layout");
  revalidatePath("/works", "page");
  revalidatePath("/works/[slug]", "page");
  revalidatePath("/about", "page");

  return NextResponse.json({ ok: true, revalidatedAt: new Date().toISOString() });
}
