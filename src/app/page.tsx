import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { FieldHoverShowcase } from "@/components/home/field-hover-showcase";
import { HomeMotionLayer } from "@/components/home/home-motion-layer";
import { FooterNavigation } from "@/components/footer-navigation";

const figmaImage = "/figma/pw2-work-image.png";
const heroSlices = Array.from({ length: 14 }, (_, index) => index);
const featuredThumbs = [
  { alt: "Interface work preview", src: "/field-media/a1-2.webp" },
  { alt: "Studio web system preview", src: figmaImage },
  { alt: "Brand visual system preview", src: "/field-media/a2-1.webp" },
  { alt: "Motion work preview", src: "/field-media/a1-1.webp" },
  { alt: "Spatial design preview", src: "/field-media/b1-1.webp" },
  { alt: "Creative experiment preview", src: "/field-media/c1-5.webp" },
  { alt: "PW2 work thumbnail", src: "/figma/pw2-work-thumb.png" },
  { alt: "Interface detail preview", src: "/field-media/a1-1.webp" },
  { alt: "Studio detail preview", src: figmaImage },
  { alt: "Visual system detail preview", src: "/field-media/a2-1.webp" },
  { alt: "Experiment detail preview", src: "/field-media/c1-5.webp" },
  { alt: "Spatial detail preview", src: "/field-media/b1-1.webp" },
  { alt: "Selected work preview", src: "/figma/pw2-work-thumb.png" },
  { alt: "Interface rhythm preview", src: "/field-media/a1-2.webp" },
  { alt: "Motion rhythm preview", src: "/field-media/a1-1.webp" },
  { alt: "Visual rhythm preview", src: "/field-media/a2-1.webp" },
  { alt: "Creative rhythm preview", src: "/field-media/c1-5.webp" },
  { alt: "Spatial rhythm preview", src: "/field-media/b1-1.webp" }
];

export default function Home() {
  return (
    <main className="pw-page pw-home-motion-root">
      <HomeMotionLayer />

      <section className="pw-home-hero" data-home-hero>
        <div className="pw-home-hero-visual" data-home-hero-visual aria-hidden="true">
          <div className="pw-home-raster-grid">
            {heroSlices.map((index) => (
              <span className="pw-home-raster-slice" key={index} style={{ "--slice-index": index } as CSSProperties} />
            ))}
          </div>
        </div>
        <div className="pw-home-hero-inner">
          <h1 className="pw-home-title" data-home-title>
            Designing clarity for complex systems.
            <br />
            <br />
            Designer / Product Thinker /
            <br />
            Creative Builder
          </h1>
          <div className="pw-meta-row caption-copy" data-home-meta>
            <span>Build with love @2026</span>
            <span>Based in Wuxi</span>
          </div>
        </div>
      </section>

      <section className="pw-home-strip" data-home-second data-home-work-strip aria-label="Featured works">
        <div className="pw-home-strip-stage" data-home-work-stage>
          <div className="pw-thumb-track" data-home-thumb-track>
            {featuredThumbs.map((thumb, index) => (
              <Link
                className="pw-thumb"
                data-cursor-hover
                href="/works"
                key={`${thumb.src}-${index}`}
                style={{ "--thumb-index": index } as CSSProperties}
              >
                <Image alt={thumb.alt} height={400} priority={index < 4} src={thumb.src} width={400} />
              </Link>
            ))}
          </div>
        </div>
        <h2 className="pw-feature-link">
          <Link className="pw-link-arrow" href="/works">
            Featured Works
          </Link>
        </h2>
      </section>

      <section className="pw-home-about" id="about">
        <div className="pw-about-copy body-copy">
          <p>
            and interfaces to brand systems, motion graphics and spatial experiences. I like moving across different mediums, because each project brings a different way to organize information, shape atmosphere and build a visual language.
          </p>
          <p>
            My work often starts with structure: understanding what needs to be communicated, how people will see it, and what kind of feeling the design should leave behind. From there, I focus on layout, rhythm, details and interaction, trying to make the final result feel clear, refined and purposeful.
          </p>
          <p>
            I am interested in design that is not only visually attractive, but also useful and memorable. Whether it is a website, a visual system, a video or a spatial presentation, I hope the work can make ideas easier to understand, while still keeping a sense of atmosphere, emotion and personality.
          </p>
        </div>
        <h2 className="pw-about-link">
          <Link className="pw-link-arrow" href="/about">
            About
          </Link>
        </h2>
      </section>

      <FieldHoverShowcase />

      <FooterNavigation />
    </main>
  );
}
