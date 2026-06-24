import type { Metadata } from "next";
import Image from "next/image";
import { DirectionShowcase } from "@/components/about/direction-showcase";
import { CascadeText } from "@/components/cascade-text";
import { FooterNavigation } from "@/components/footer-navigation";

export const metadata: Metadata = {
  title: "About",
  description: "About Carl Wang Studio and contact."
};

const aboutImage = "/figma/about-main.png";
const quoteMark = "/figma/about-quote.svg";
const quoteLine = "/figma/about-quote-line.svg";
const experienceThumb = "/figma/about-experience-thumb.png";

const bodyCopy = [
  "and interfaces to brand systems, motion graphics and spatial experiences. I like moving across different mediums, because each project brings a different way to organize information, shape atmosphere and build a visual language.",
  "My work often starts with structure: understanding what needs to be communicated, how people will see it, and what kind of feeling the design should leave behind. From there, I focus on layout, rhythm, details and interaction, trying to make the final result feel clear, refined and purposeful.",
  "I am interested in design that is not only visually attractive, but also useful and memorable. Whether it is a website, a visual system, a video or a spatial presentation, I hope the work can make ideas easier to understand, while still keeping a sense of atmosphere, emotion and personality."
];

const experienceRows = [
  { id: "designer-primary", role: "Designer", title: "Wattsonic", year: "2025-2026" },
  { id: "uiux", role: "UI UX Designer", title: "Wattsonic", year: "2025-2026" },
  { id: "graphic", role: "Graphic Designer", title: "Wattsonic", year: "2025-2026" },
  { id: "designer-secondary", role: "Designer", title: "Wattsonic", year: "2025-2026" }
];

const socialIconLinks = [
  { label: "Behance", href: "https://www.behance.net/", src: "/figma/social-behance.svg" },
  { label: "Zcool", href: "https://www.zcool.com.cn/", src: "/figma/social-zcool.svg" },
  { label: "Xiaohongshu", href: "https://www.xiaohongshu.com/", src: "/figma/social-xiaohongshu.svg" },
  { label: "GitHub", href: "https://github.com/", src: "/figma/social-github.svg" },
  { label: "LinkedIn", href: "https://www.linkedin.com/", src: "/figma/social-linkedin.svg" },
  { label: "Email", href: "mailto:hello@carlwang.cn", src: "/figma/social-email.svg" }
];

export default function AboutPage() {
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
              <span>
                A designer working across digital interfaces, brand visuals, motion content and spatial experiences.
              </span>
              <span className="caption-copy">Carl Wang</span>
            </span>
          </div>
          <h1 className="pw-about-title">About</h1>
        </div>

        <div className="pw-about-body body-copy">
          <div className="pw-about-body-copy">
            {bodyCopy.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <span className="pw-figma-image">
            <Image alt="PW2 about visual" height={449} src={aboutImage} width={371} />
          </span>
        </div>
      </section>

      <DirectionShowcase />

      <section className="pw-about-experience">
        <div className="pw-experience-heading">
          <span aria-hidden="true" />
          <h2 className="pw-kicker-line">Experience</h2>
        </div>
        <div className="pw-experience-rows">
          {experienceRows.map((row) => (
            <div className="pw-experience-item" key={row.id} tabIndex={0}>
              <span className="pw-experience-role">
                <CascadeText text={row.role} underline={false} wrap />
              </span>
              <span className="pw-experience-thumb-slot">
                <span className="pw-role-thumb">
                  <Image alt="PW2 role thumbnail" height={80} src={experienceThumb} width={80} />
                </span>
              </span>
              <strong className="pw-experience-company">
                <CascadeText text={row.title} />
              </strong>
              <span className="pw-experience-year">{row.year}</span>
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
            <h3 className="pw-contact-title">Get in touch</h3>
            <p className="pw-contact-subtitle">
              For product, interface, brand, and visual system work.
            </p>
          </div>
          <form className="pw-static-form">
            <div className="pw-form-grid">
              <input aria-label="Name" className="pw-static-input" placeholder="Name*" readOnly />
              <input aria-label="Email" className="pw-static-input" placeholder="Email*" readOnly />
            </div>
            <textarea aria-label="Message" className="pw-static-textarea" placeholder="Message*" readOnly />
            <button className="pw-static-submit" type="button">
              Send Message
            </button>
          </form>
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
            {socialIconLinks.map((link) => (
              <a
                aria-label={link.label}
                className="pw-social-tile"
                href={link.href}
                key={link.label}
                rel={link.href.startsWith("mailto:") ? undefined : "noreferrer"}
                target={link.href.startsWith("mailto:") ? undefined : "_blank"}
              >
                <Image alt="" height={100} loading="eager" src={link.src} width={100} />
              </a>
            ))}
          </div>
        </div>
      </section>

      <FooterNavigation />
    </main>
  );
}
