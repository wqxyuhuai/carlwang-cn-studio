import type { CSSProperties } from "react";
import Link from "next/link";
import { CascadeText } from "@/components/cascade-text";
import { getPublicContent, sectionByKey } from "@/lib/public-content";

function ExternalOrInternalLink({ className, href, label }: { className?: string; href: string; label: string }) {
  if (!href) return null;
  if (href.startsWith("http") || href.startsWith("mailto:")) {
    return (
      <a
        className={className}
        href={href}
        rel={href.startsWith("mailto:") ? undefined : "noreferrer"}
        target={href.startsWith("mailto:") ? undefined : "_blank"}
      >
        <CascadeText text={label} underline={false} />
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      <CascadeText text={label} underline={false} />
    </Link>
  );
}

function socialHref(url: string) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("mailto:") || url.startsWith("/")) return url;
  if (url.includes("@")) return `mailto:${url}`;
  return url;
}

function socialPlatformKey(link: { platform?: string; label?: string }) {
  return (link.platform || link.label || "link").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function FooterNavigation() {
  const content = await getPublicContent();
  const footerMain = sectionByKey(content, "footer_main");
  const footerLinks = content.socials.filter((link) => (link.footerVisible || link.group === "Contact") && link.status !== "Archived" && link.url);
  const workTypeLinks = content.workTypes.filter((type) => type.filterVisible && type.status !== "Archived");
  const socialIcons = footerLinks.filter((link) => link.footerIconUrl || link.iconUrl || link.colorIconUrl);
  const footerGroups = [
    {
      title: "Home",
      links: [
        { label: "Hero", href: "/#home" },
        { label: "Featured Works", href: "/#featured-works" },
        { label: "About", href: "/#about" },
        { label: "Design Fields", href: "/#design-fields" }
      ]
    },
    {
      title: "Works",
      links: workTypeLinks.map((type) => ({ label: type.shortLabel || type.nameEn, href: `/works?type=${type.slug}` }))
    },
    {
      title: "About",
      links: [
        { label: "Intro", href: "/about#intro" },
        { label: "Direction", href: "/about#direction" },
        { label: "Experience", href: "/about#experience" },
        { label: "Contact", href: "/about#contact" },
        { label: "Social Links", href: "/about#social-links" }
      ]
    }
  ];

  return (
    <footer className="pw-footer">
      <div className="pw-footer-brand">
        <div>
          <div className="pw-footer-logo" aria-label="Carl Wang Studio">
            <span>Carl Wang</span>
            <span>Studio</span>
          </div>
          <p className="caption-copy text-muted footer-copy">A designer working across visual, digital and spatial systems.</p>
          {socialIcons.length > 0 ? (
            <div className="pw-footer-socials" aria-label="Social links">
              {socialIcons.map((link) => (
                (() => {
                  const footerIcon = link.footerIconUrl || link.iconUrl || link.colorIconUrl;
                  const platformKey = socialPlatformKey(link);
                  const specialHover = Boolean(link.lightColorIconUrl) || platformKey === "github" || platformKey === "email";
                  const href = socialHref(link.url);
                  return (
                    <a
                      aria-label={`${link.label} (opens in a new tab)`}
                      className="pw-social-icon"
                      data-platform={platformKey}
                      href={href}
                      key={link.id || link.url}
                      rel={href.startsWith("http") ? "noreferrer" : undefined}
                      target={href.startsWith("http") ? "_blank" : undefined}
                    >
                      <span
                        aria-hidden="true"
                        className="pw-social-icon-image pw-social-icon-base"
                        style={{
                          maskImage: `url(${footerIcon})`,
                          WebkitMaskImage: `url(${footerIcon})`
                        }}
                      />
                      {link.colorIconUrl ? (
                        <span
                          aria-hidden="true"
                          className={["pw-social-icon-image pw-social-icon-color", specialHover ? "pw-social-icon-color-special" : ""].filter(Boolean).join(" ")}
                          style={specialHover ? {
                            backgroundColor: "var(--color-black)",
                            backgroundImage: "none",
                            maskImage: `url(${footerIcon})`,
                            maskPosition: "center",
                            maskRepeat: "no-repeat",
                            maskSize: "contain",
                            WebkitMaskImage: `url(${footerIcon})`,
                            WebkitMaskPosition: "center",
                            WebkitMaskRepeat: "no-repeat",
                            WebkitMaskSize: "contain"
                          } as CSSProperties : {
                            backgroundImage: `url(${link.colorIconUrl})`
                          }}
                        />
                      ) : null}
                    </a>
                  );
                })()
              ))}
            </div>
          ) : null}
        </div>
        <p className="caption-copy pw-footer-copy">{footerMain?.subtitleEn || "Built with care."}</p>
      </div>

      <div className="pw-footer-right">
        <nav className="pw-footer-nav" aria-label="Footer navigation">
          {footerGroups.map((group) => group.links.length > 0 ? (
            <div className="pw-footer-group" key={group.title}>
              <strong className="caption-copy">{group.title}</strong>
              {group.links.map((link) => (
                <ExternalOrInternalLink className="caption-copy" href={link.href} key={`${group.title}-${link.href}-${link.label}`} label={link.label} />
              ))}
            </div>
          ) : null)}
        </nav>
        <p className="caption-copy pw-footer-copy">{"\u00A9 Carl Wang. All rights reserved."}</p>
      </div>
    </footer>
  );
}
