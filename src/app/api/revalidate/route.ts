import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { noStoreJson } from "@/lib/api-response";
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
    return noStoreJson({ ok: false, error: "Invalid revalidate secret." }, { status: 401 });
  }

  // Keep the last valid render available while the first request refreshes
  // published content in the background. Expiring the root layout here made
  // that visitor synchronously rebuild every public route in the Worker.
  revalidateTag(PUBLIC_CONTENT_CACHE_TAG, "max");

  return noStoreJson({
    ok: true,
    mode: "stale-while-revalidate",
    revalidatedAt: new Date().toISOString()
  });
}
