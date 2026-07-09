import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getOssConfig, ossPublicUrl, putJsonToOss } from "@/lib/admin/oss";
import { PUBLIC_CONTENT_CACHE_TAG } from "@/lib/public-content";
import { incrementWorkViewCount } from "@/lib/work-view-counts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OssContent = {
  works?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

function numberValue(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

async function readOssContent(): Promise<OssContent> {
  const contentKey = getOssConfig().contentKey;
  const contentUrl = process.env.NEXT_PUBLIC_CONTENT_URL || ossPublicUrl(contentKey);
  const separator = contentUrl.includes("?") ? "&" : "?";
  const url = `${contentUrl}${separator}viewBust=${Date.now()}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`OSS content read failed (${response.status}).`);
  }

  return await response.json() as OssContent;
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const contentKey = getOssConfig().contentKey;
  const content = await readOssContent();
  const works = Array.isArray(content.works) ? content.works : [];
  const target = works.find((work) => String(work.slug || "") === slug);

  if (!target) {
    return NextResponse.json({ ok: false, error: "Work not found." }, { status: 404 });
  }

  const baseViewCount = numberValue(target.viewCount);
  const d1ViewCount = await incrementWorkViewCount(slug, baseViewCount);
  const viewCount = d1ViewCount ?? baseViewCount + 1;
  target.viewCount = viewCount;

  if (d1ViewCount === null) {
    await putJsonToOss(contentKey, content);
  }

  revalidateTag(PUBLIC_CONTENT_CACHE_TAG, "max");
  revalidatePath("/works", "page");
  revalidatePath(`/works/${slug}`, "page");

  return NextResponse.json({ ok: true, slug, viewCount });
}
