import { revalidateTag } from "next/cache";
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

  // Keep the last valid render available while the first request refreshes
  // published content in the background. Expiring the root layout here made
  // that visitor synchronously rebuild every public route in the Worker.
  revalidateTag(PUBLIC_CONTENT_CACHE_TAG, "max");

  return NextResponse.json({
    ok: true,
    mode: "stale-while-revalidate",
    revalidatedAt: new Date().toISOString()
  });
}
