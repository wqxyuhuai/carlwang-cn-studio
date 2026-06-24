import Image from "next/image";
import Link from "next/link";
import { FooterNavigation } from "@/components/footer-navigation";

const figmaImage = "/figma/pw2-work-image.png";
const fieldLabels = ["Website & Interface", "Brand & Visual System", "Motion & Video", "Exhibition & Spatial", "Creative Experiments"];

export default function Home() {
  return (
    <main className="pw-page">
      <section className="pw-home-hero">
        <div className="pw-home-hero-inner">
          <h1 className="pw-home-title">
            Designing clarity for complex systems.
            <br />
            <br />
            Designer / Product Thinker /
            <br />
            Creative Builder
          </h1>
          <div className="pw-meta-row caption-copy">
            <span>Build with love @2026</span>
            <span>Based in Wuxi</span>
          </div>
        </div>
      </section>

      <section className="pw-home-strip" aria-label="Featured works">
        <div className="pw-thumb-track">
          {Array.from({ length: 9 }, (_, index) => (
            <Link className="pw-thumb" href="/works" key={index}>
              <Image alt="PW2 selected work thumbnail" height={400} priority={index === 0} src={figmaImage} width={400} />
            </Link>
          ))}
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

      <section className="pw-fields-band" aria-label="Design fields">
        <span className="pw-figma-image">
          <Image alt="PW2 motion field image" height={400} src={figmaImage} width={400} />
        </span>
        <div className="pw-field-list">
          {fieldLabels.map((label) => (
            <span className={label === "Motion & Video" ? "is-active" : undefined} key={label}>
              {label}
            </span>
          ))}
        </div>
      </section>

      <FooterNavigation />
    </main>
  );
}
