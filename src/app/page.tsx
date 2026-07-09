import type { Metadata } from "next";
import { AboutPageContent } from "@/components/about/about-page-content";
import { FeaturedWorkCanvas } from "@/components/home/featured-work-canvas";
import { StudioTabbedShell } from "@/components/home/studio-tabbed-shell";
import { WorksBrowser } from "@/components/works/works-browser";
import { getPublicContent } from "@/lib/public-content";

const fallbackPreviewImage = "/figma/pw2-work-image.png";
const contactEmailHref = "mailto:wqxyuhuai@163.com";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublicContent();
  return {
    title: {
      absolute: "Studio | Carl Wang"
    },
    description: content.settings.seoDescription || "A designer working across visual, digital and spatial systems.",
    openGraph: {
      title: content.settings.seoTitle || "Carl Wang Studio",
      description: content.settings.seoDescription || "A designer working across visual, digital and spatial systems.",
      images: [{ url: fallbackPreviewImage }]
    }
  };
}

export default async function Home() {
  const content = await getPublicContent();
  const works = content.works.filter((work) => work.status === "Published").sort((left, right) => left.order - right.order);
  const featuredWorks = works.filter((work) => work.featured).sort((left, right) => (left.featuredOrder || left.order) - (right.featuredOrder || right.order));
  const featured = featuredWorks.length > 0 ? featuredWorks : works.filter((work) => work.featured).concat(works).slice(0, 8);
  return (
    <StudioTabbedShell
      about={<AboutPageContent content={content} includeFooter={false} />}
      contactHref={contactEmailHref}
      featured={<FeaturedWorkCanvas works={featured} />}
      list={<WorksBrowser basePath="/" initialMode="grid" title="Works from" workTypes={content.workTypes} works={works} />}
    />
  );
}
