import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { FieldHoverShowcase } from "@/components/home/field-hover-showcase";
import { HomeMotionLayer } from "@/components/home/home-motion-layer";
import { FooterNavigation } from "@/components/footer-navigation";
import { getFeaturedWorks, getPublicContent, sectionByKey } from "@/lib/public-content";

const figmaImage = "/figma/pw2-work-image.png";
const homeAboutCopy = [
  "and interfaces to brand systems, motion graphics and spatial experiences. I like moving across different mediums, because each project brings a different way to organize information, shape atmosphere and build a visual language.",
  "My work often starts with structure: understanding what needs to be communicated, how people will see it, and what kind of feeling the design should leave behind. From there, I focus on layout, rhythm, details and interaction, trying to make the final result feel clear, refined and purposeful.",
  "I'm interested in design that is not only visually attractive, but also useful and memorable. Whether it is a website, a visual system, a video or a spatial presentation, I hope the work can make ideas easier to understand, while still keeping a sense of atmosphere, emotion and personality."
];
const heroSlices = Array.from({ length: 14 }, (_, index) => index);
const fallbackMedia = ["/field-media/a1-2.webp", figmaImage, "/field-media/a2-1.webp", "/field-media/a1-1.webp", "/field-media/b1-1.webp", "/field-media/c1-5.webp"];
const homeTrackMinItems = 18;

type HomeTrackItem = {
  slug?: string;
  title: string;
  cover: {
    alt?: string;
    src?: string;
  };
};

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublicContent();
  return {
    title: content.settings.seoTitle || "Carl Wang Studio",
    description: content.settings.seoDescription || "A designer working across visual, digital and spatial systems.",
    openGraph: {
      title: content.settings.seoTitle || "Carl Wang Studio",
      description: content.settings.seoDescription || "A designer working across visual, digital and spatial systems.",
      images: [{ url: figmaImage }]
    }
  };
}

export default async function Home() {
  const [content, featuredWorks] = await Promise.all([getPublicContent(), getFeaturedWorks()]);
  const hero = sectionByKey(content, "home_hero");
  const featuredSection = sectionByKey(content, "home_featured_works");
  const projectTypes = content.workTypes.filter((type) => (type.homeVisible || type.filterVisible) && type.status !== "Archived");
  const sourceThumbs: HomeTrackItem[] = (featuredWorks.length > 0 ? featuredWorks : content.works.filter((work) => work.status === "Published")).slice(0, homeTrackMinItems);
  const fallbackThumbs: HomeTrackItem[] = fallbackMedia.map((src, index) => ({
    slug: "studio-web-system",
    title: "Selected work",
    cover: { src, alt: `Selected work preview ${index + 1}` }
  }));
  const baseTrackItems = sourceThumbs.length > 0 ? sourceThumbs : fallbackThumbs;
  const trackItems = Array.from({ length: Math.max(homeTrackMinItems, baseTrackItems.length) }, (_, index) => baseTrackItems[index % baseTrackItems.length]);
  const fieldItems = projectTypes.map((type, index) => ({
    label: type.shortLabel || type.nameEn,
    media: {
      alt: `${type.nameEn} visual`,
      kind: "image" as const,
      src: type.iconUrl || fallbackMedia[index % fallbackMedia.length]
    }
  }));

  return (
    <main className="pw-page pw-home-motion-root">
      <HomeMotionLayer />

      <section className="pw-home-hero" data-home-hero id="home">
        <div className="pw-home-hero-visual" data-home-hero-visual aria-hidden="true">
          <div className="pw-home-raster-grid">
            {heroSlices.map((index) => (
              <span className="pw-home-raster-slice" key={index} style={{ "--slice-index": index } as CSSProperties} />
            ))}
          </div>
        </div>
        <div className="pw-home-hero-inner">
          <h1 className="pw-home-title" data-home-title>
            <span className="pw-home-title-group">
              <span>{hero?.titleEn || content.settings.homeHeroTitle}</span>
              <span>{hero?.subtitleEn || content.settings.homeHeroDescription}</span>
            </span>
          </h1>
          <div className="pw-meta-row caption-copy" data-home-meta>
            <span>Build with love @2026</span>
            <span>Based in Wuxi</span>
          </div>
        </div>
      </section>

      <section className="pw-home-strip" data-home-second data-home-work-strip id="featured-works" aria-label="Featured works">
        <div className="pw-home-strip-stage" data-home-work-stage>
          <div className="pw-thumb-track" data-home-thumb-track>
            {trackItems.map((work, index) => (
              <Link
                className="pw-thumb"
                data-cursor-hover
                href={typeof work.slug === "string" ? `/works/${work.slug}` : "/works"}
                key={`${work.slug || work.cover.src}-${index}`}
                style={{ "--thumb-index": index } as CSSProperties}
              >
                <Image alt={work.cover.alt || work.title} height={400} src={work.cover.src || figmaImage} width={400} />
              </Link>
            ))}
          </div>
        </div>
        <h2 className="pw-feature-link">
          <Link className="pw-link-arrow" href="/works">
            {featuredSection?.titleEn || "Featured Works"}
          </Link>
        </h2>
      </section>

      <section className="pw-home-about" id="about">
        <div className="pw-about-copy body-copy">
          {homeAboutCopy.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <h2 className="pw-about-link">
          <Link className="pw-link-arrow" href="/about">
            About
          </Link>
        </h2>
      </section>

      <FieldHoverShowcase items={fieldItems} />

      <FooterNavigation />
    </main>
  );
}
