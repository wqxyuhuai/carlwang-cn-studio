import Image from "next/image";
import { CascadeText } from "@/components/cascade-text";
import { ContactForm } from "@/components/contact-form";
import { FooterNavigation } from "@/components/footer-navigation";
import { DirectionShowcase } from "@/components/about/direction-showcase";
import { aboutPlaceholderImage, sectionByKey, sectionParagraphs } from "@/lib/public-content";
import type { PublicContent } from "@/lib/public-content";

const quoteMark = "/figma/about-quote.svg";
const experienceThumb = "/figma/about-experience-thumb.png";
const fallbackDirectionMedia = ["/field-media/a1-2.webp", "/field-media/a2-1.webp", "/figma/about-direction.png", "/field-media/b1-1.webp"];
const fallbackSocialIcon = "/figma/social-email.svg";
const defaultSocialCardBackground = "var(--color-black-10)";
const defaultSocialLogoColor = "var(--color-black)";
const contactEmailHref = "mailto:wqxyuhuai@163.com";

const aboutBodyCopy = [
  "I’m a designer who enjoys working between different forms of visual expression — from websites and interfaces to brand systems, motion graphics and spatial experiences. I like moving across different mediums, because each project brings a different way to organize information, shape atmosphere and build a visual language.",
  "My work often starts with structure: understanding what needs to be communicated, how people will see it, and what kind of feeling the design should leave behind. From there, I focus on layout, rhythm, details and interaction, trying to make the final result feel clear, refined and purposeful.",
  "I'm interested in design that is not only visually attractive, but also useful and memorable. Whether it is a website, a visual system, a video or a spatial presentation, I hope the work can make ideas easier to understand, while still keeping a sense of atmosphere, emotion and personality."
];

const experienceRows = [
  { id: "designer", role: "Designer", company: "Wattsonic", period: "2025-2026", image: experienceThumb },
  { id: "ui-ux-designer", role: "UI UX Designer", company: "Wattsonic", period: "2025-2026", image: experienceThumb },
  { id: "graphic-designer", role: "Graphic Designer", company: "Wattsonic", period: "2025-2026", image: experienceThumb },
  { id: "designer-2", role: "Designer", company: "Wattsonic", period: "2025-2026", image: experienceThumb }
];

export function AboutPageContent({ content, includeFooter = true }: { content: PublicContent; includeFooter?: boolean }) {
  const aboutIntro = sectionByKey(content, "about_intro");
  const portrait = sectionByKey(content, "about_portrait");
  const direction = sectionByKey(content, "about_design_direction");
  const experienceSection = sectionByKey(content, "about_experience");
  const contactSection = sectionByKey(content, "about_contact");
  const directionTypes = content.workTypes.filter((type) => type.status !== "Archived" && type.filterVisible);
  const directionItems = directionTypes.map((type, index) => ({
    label: type.shortLabel || type.nameEn,
    media: {
      alt: `${type.shortLabel || type.nameEn} direction visual`,
      src: type.iconUrl || fallbackDirectionMedia[index % fallbackDirectionMedia.length]
    }
  }));
  const socialLinks = content.socials.filter((link) => link.contactVisible && link.status !== "Archived");
  const dynamicExperienceRows = content.experiences.map((experience) => ({
    id: experience.id,
    role: experience.title,
    company: experience.organization,
    period: experience.dateLabel || [experience.startDate, experience.isCurrent ? "Present" : experience.endDate].filter(Boolean).join("-"),
    image: experience.imageUrl || experienceThumb
  }));
  const visibleExperienceRows = dynamicExperienceRows.length > 0 ? dynamicExperienceRows : experienceRows;
  const paragraphs = sectionParagraphs(aboutIntro, aboutBodyCopy);

  return (
    <div className="pw-about-page">
      <section className="pw-about-hero" id="intro">
        <div className="pw-about-hero-left">
          <div className="pw-about-quote">
            <span className="pw-about-quote-art" aria-hidden="true">
              <span
                className="pw-about-quote-mark"
                style={{
                  maskImage: `url(${quoteMark})`,
                  WebkitMaskImage: `url(${quoteMark})`
                }}
              />
              <span className="pw-about-quote-line" />
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
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <span className="pw-figma-image">
            <Image alt={portrait?.titleEn || "Carl Wang Studio portrait visual"} height={449} src={portrait?.mediaUrl || aboutPlaceholderImage} width={371} />
          </span>
        </div>
      </section>

      <DirectionShowcase heading={direction?.titleEn || "Design Direction"} id="direction" items={directionItems} />

      <section className="pw-about-experience" id="experience">
        <div className="pw-experience-heading">
          <span aria-hidden="true" />
          <h2 className="pw-kicker-line">{experienceSection?.titleEn || "Experience"}</h2>
        </div>
        <div className="pw-experience-rows">
          {visibleExperienceRows.map((row) => (
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

      <section className="pw-about-social" id="social-links">
        <div className="pw-section-heading-grid">
          <span aria-hidden="true" />
          <h2 className="pw-kicker-line">Social Links</h2>
        </div>
        <div className="pw-section-content-grid">
          <span aria-hidden="true" />
          <div className="pw-social-grid" aria-label="Social links">
            {socialLinks.map((link) => {
              const socialLogoColor = link.cardLogoColor || defaultSocialLogoColor;
              const socialIconUrl = link.footerIconUrl || link.colorIconUrl || link.iconUrl || fallbackSocialIcon;
              const socialHref = link.platform.toLowerCase() === "email" || link.url.startsWith("mailto:") ? contactEmailHref : link.url;
              return (
                <a
                  aria-label={link.label}
                  className="pw-social-tile"
                  href={socialHref}
                  style={{
                    backgroundColor: link.cardBackgroundColor || defaultSocialCardBackground
                  }}
                  key={link.id || link.url}
                  rel={socialHref.startsWith("mailto:") ? undefined : "noreferrer"}
                  target={socialHref.startsWith("mailto:") ? undefined : "_blank"}
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

      {includeFooter ? <FooterNavigation /> : null}
    </div>
  );
}
