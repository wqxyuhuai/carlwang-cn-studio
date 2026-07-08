import type { Metadata } from "next";
import { AboutPageContent } from "@/components/about/about-page-content";
import { FeaturedWorkCanvas } from "@/components/home/featured-work-canvas";
import { StudioTabbedShell } from "@/components/home/studio-tabbed-shell";
import { WorksBrowser } from "@/components/works/works-browser";
import { getFeaturedWorks, getPublicContent } from "@/lib/public-content";

const fallbackPreviewImage = "/figma/pw2-work-image.png";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublicContent();
  return {
    title: content.settings.seoTitle || "Carl Wang Studio",
    description: content.settings.seoDescription || "A designer working across visual, digital and spatial systems.",
    openGraph: {
      title: content.settings.seoTitle || "Carl Wang Studio",
      description: content.settings.seoDescription || "A designer working across visual, digital and spatial systems.",
      images: [{ url: fallbackPreviewImage }]
    }
  };
}

export default async function Home() {
  const [content, featuredWorks] = await Promise.all([getPublicContent(), getFeaturedWorks()]);
  const works = content.works.filter((work) => work.status === "Published").sort((left, right) => left.order - right.order);
  const featured = featuredWorks.length > 0 ? featuredWorks : works.filter((work) => work.featured).concat(works).slice(0, 8);
  const emailLink =
    content.socials.find((link) => link.url.startsWith("mailto:"))?.url ||
    `mailto:${content.settings.contactEmail || "hello@carlwang.cn"}`;

  return (
    <StudioTabbedShell
      about={<AboutPageContent content={content} includeFooter={false} />}
      contactHref={emailLink}
      featured={<FeaturedWorkCanvas works={featured} />}
      list={<WorksBrowser basePath="/" initialMode="list" showViewToggle={false} title="Works from" workTypes={content.workTypes} works={works} />}
    />
  );
}
