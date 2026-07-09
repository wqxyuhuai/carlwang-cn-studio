import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_CONTENT_CACHE_TAG } from "@/lib/cache-tags";
import { getOssConfig, hasOssConfig, ossPublicUrl, putJsonToOss } from "@/lib/oss";
import { getPublicContent } from "@/lib/public-content";
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
  const publicContent = await getPublicContent();
  const publicWork = publicContent.works.find((work) => work.slug === slug);

  if (!publicWork) {
    return NextResponse.json({ ok: false, error: "Work not found." }, { status: 404 });
  }

  const baseViewCount = numberValue(publicWork.viewCount);
  const d1ViewCount = await incrementWorkViewCount(slug, baseViewCount);
  if (d1ViewCount !== null) {
    return NextResponse.json({ ok: true, slug, viewCount: d1ViewCount });
  }

  if (!hasOssConfig()) {
    return NextResponse.json({ ok: true, persisted: false, slug, viewCount: baseViewCount + 1 });
  }

  const contentKey = getOssConfig().contentKey;
  const content = await readOssContent();
  const works = Array.isArray(content.works) ? content.works : [];
  const target = works.find((work) => String(work.slug || "") === slug);
  const viewCount = baseViewCount + 1;

  if (target) {
    target.viewCount = viewCount;
    await putJsonToOss(contentKey, content);
  }

  revalidateTag(PUBLIC_CONTENT_CACHE_TAG, "max");
  revalidatePath("/works", "page");
  revalidatePath(`/works/${slug}`, "page");

  return NextResponse.json({ ok: true, slug, viewCount });
}
