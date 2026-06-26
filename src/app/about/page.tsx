import type { Metadata } from "next";
import Image from "next/image";
import { DirectionShowcase } from "@/components/about/direction-showcase";
import { CascadeText } from "@/components/cascade-text";
import { ContactForm } from "@/components/contact-form";
import { FooterNavigation } from "@/components/footer-navigation";
import { aboutPlaceholderImage, getPublicContent, sectionByKey } from "@/lib/public-content";

const quoteMark = "/figma/about-quote.svg";
const quoteLine = "/figma/about-quote-line.svg";
const experienceThumb = "/figma/about-experience-thumb.png";
const fallbackDirectionMedia = ["/field-media/a1-2.webp", "/field-media/a2-1.webp", "/figma/about-direction.png", "/field-media/b1-1.webp"];
const fallbackSocialIcon = "/figma/social-email.svg";
const defaultSocialCardBackground = "var(--color-black-10)";
const defaultSocialLogoColor = "var(--color-black)";

const aboutBodyCopy = [
  "and interfaces to brand systems, motion graphics and spatial experiences. I like moving across different mediums, because each project brings a different way to organize information, shape atmosphere and build a visual language.",
  "My work often starts with structure: understanding what needs to be communicated, how people will see it, and what kind of feeling the design should leave behind. From there, I focus on layout, rhythm, details and interaction, trying to make the final result feel clear, refined and purposeful.",
  "I'm interested in design that is not only visually attractive, but also useful and memorable. Whether it is a website, a visual system, a video or a spatial presentation, I hope the work can make ideas easier to understand, while still keeping a sense of atmosphere, emotion and personality."
];

const experienceRows = [
  { id: "designer", role: "Designer", company: "Wattsonic", period: "2025-2026", image: experienceThumb },
  { id: "ui-ux-designer", role: "UI UX Designer", company: "Wattsonic", period: "2025-2026", image: experienceThumb },
  { id: "graphic-designer", role: "Graphic Designer", company: "Wattsonic", period: "2025-2026", image: experienceThumb },
  { id: "designer-2", role: "Designer", company: "Wattsonic", period: "2025-2026", image: experienceThumb }
];

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublicContent();
  const aboutIntro = sectionByKey(content, "about_intro");
  return {
    title: aboutIntro?.titleEn || "About",
    description: aboutIntro?.subtitleEn || "About Carl Wang Studio and contact."
  };
}

export default async function AboutPage() {
  const content = await getPublicContent();
  const aboutIntro = sectionByKey(content, "about_intro");
  const portrait = sectionByKey(content, "about_portrait");
  const direction = sectionByKey(content, "about_design_direction");
  const experienceSection = sectionByKey(content, "about_experience");
  const contactSection = sectionByKey(content, "about_contact");
  const directionTypes = content.workTypes.filter((type) => type.status !== "Archived" && type.filterVisible);
  const directionItems = (directionTypes.length > 0 ? directionTypes : []).slice(0, 4).map((type, index) => ({
    label: type.shortLabel || type.nameEn,
    media: {
      alt: `${type.shortLabel || type.nameEn} direction visual`,
      src: type.iconUrl || fallbackDirectionMedia[index % fallbackDirectionMedia.length]
    }
  }));
  const socialLinks = content.socials.filter((link) => link.contactVisible && link.status !== "Archived");

  return (
    <main className="pw-about-page">
      <section className="pw-about-hero">
        <div className="pw-about-hero-left">
          <div className="pw-about-quote">
            <span className="pw-about-quote-art" aria-hidden="true">
              <Image alt="" className="pw-about-quote-mark" height={20} src={quoteMark} width={28} />
              <Image alt="" className="pw-about-quote-line" height={84} src={quoteLine} width={1} />
            </span>
            <span className="pw-about-quote-copy">
              <span>{aboutIntro?.subtitleEn || "A designer working across digital interfaces, brand visuals, motion content and spatial experiences."}</span>
              <span className="caption-copy">Carl Wang</span>
            </span>
          </div>
          <h1 className="pw-about-title">{aboutIntro?.titleEn || "About"}</h1>
        </div>

        <div className="pw-about-body body-copy">
          <div className="pw-about-body-copy">
            {aboutBodyCopy.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <span className="pw-figma-image">
            <Image alt={portrait?.titleEn || "Carl Wang Studio portrait visual"} height={449} src={portrait?.mediaUrl || aboutPlaceholderImage} width={371} />
          </span>
        </div>
      </section>

      <DirectionShowcase heading={direction?.titleEn || "Design Direction"} items={directionItems} />

      <section className="pw-about-experience">
        <div className="pw-experience-heading">
          <span aria-hidden="true" />
          <h2 className="pw-kicker-line">{experienceSection?.titleEn || "Experience"}</h2>
        </div>
        <div className="pw-experience-rows">
          {experienceRows.map((row) => (
            <div className="pw-experience-item" key={row.id} tabIndex={0}>
              <span className="pw-experience-role">
                <CascadeText text={row.role} underline={false} wrap />
              </span>
              <span className="pw-experience-thumb-slot">
                <span className="pw-role-thumb" aria-hidden="true">
                  <Image alt="" height={80} src={row.image} width={80} />
                </span>
              </span>
              <strong className="pw-experience-company">{row.company}</strong>
              <span className="pw-experience-year">{row.period}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="pw-about-contact" id="contact">
        <div className="pw-section-heading-grid">
          <span aria-hidden="true" />
          <h2 className="pw-kicker-line">Contact Form</h2>
        </div>
        <div className="pw-section-content-grid">
          <div>
            <h3 className="pw-contact-title">{contactSection?.titleEn || "Get in touch"}</h3>
            <p className="pw-contact-subtitle">
              {contactSection?.subtitleEn || "For product, interface, brand, and visual system work."}
            </p>
          </div>
          <ContactForm sourcePage="/about#contact" variant="about" />
        </div>
      </section>

      <section className="pw-about-social">
        <div className="pw-section-heading-grid">
          <span aria-hidden="true" />
          <h2 className="pw-kicker-line">Social Links</h2>
        </div>
        <div className="pw-section-content-grid">
          <span aria-hidden="true" />
          <div className="pw-social-grid" aria-label="Social links">
            {socialLinks.map((link) => {
              const socialLogoColor = link.cardLogoColor || defaultSocialLogoColor;
              const socialIconUrl = link.colorIconUrl || link.iconUrl || fallbackSocialIcon;
              return (
                <a
                  aria-label={link.label}
                  className="pw-social-tile"
                  href={link.url}
                  style={{
                    backgroundColor: link.cardBackgroundColor || defaultSocialCardBackground
                  }}
                  key={link.id || link.url}
                  rel={link.url.startsWith("mailto:") ? undefined : "noreferrer"}
                  target={link.url.startsWith("mailto:") ? undefined : "_blank"}
                >
                  <span
                    aria-hidden="true"
                    className="pw-social-tile-icon"
                    style={{
                      backgroundColor: socialLogoColor,
                      maskImage: `url(${socialIconUrl})`,
                      WebkitMaskImage: `url(${socialIconUrl})`
                    }}
                  />
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <FooterNavigation />
    </main>
  );
}
