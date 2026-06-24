import type { MetadataRoute } from "next";
import { getPublishedWorks } from "@/lib/site-data";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const works = await getPublishedWorks();
  const base = "https://studio.carlwang.cn";

  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/works`, lastModified: new Date() },
    { url: `${base}/about`, lastModified: new Date() },
    ...works.map((work) => ({
      url: `${base}/works/${work.slug}`,
      lastModified: new Date()
    }))
  ];
}
