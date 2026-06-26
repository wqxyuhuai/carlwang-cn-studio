import Link from "next/link";
import Image from "next/image";
import { getPublicContent, sectionByKey } from "@/lib/public-content";

const fallbackIcon = "/figma/footer-social-x.svg";

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
        {label}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {label}
    </Link>
  );
}

export async function FooterNavigation() {
  const content = await getPublicContent();
  const footerMain = sectionByKey(content, "footer_main");
  const footerContact = sectionByKey(content, "footer_contact");
  const footerLinks = content.socials.filter((link) => link.footerVisible && link.status !== "Archived" && link.url);
  const workTypeLinks = content.workTypes.filter((type) => type.filterVisible && type.status !== "Archived").slice(0, 6);
  const socialIcons = footerLinks.filter((link) => link.iconUrl).slice(0, 4);
  const footerBrandTagline = "A designer working across visual, digital and spatial systems.";
  const footerGroups = [
    {
      title: "Home",
      links: [
        { label: "Home", href: "/" },
        { label: "Works", href: "/works" },
        { label: "About", href: "/about" }
      ]
    },
    {
      title: "Work Types",
      links: workTypeLinks.map((type) => ({ label: type.shortLabel || type.nameEn, href: `/works?type=${type.slug}` }))
    },
    {
      title: footerContact?.titleEn || "Contact",
      links: footerLinks.map((link) => ({ label: link.label, href: link.url }))
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
                <a
                  aria-label={`${link.label} (opens in a new tab)`}
                  className="pw-social-icon"
                  href={link.url}
                  key={link.id || link.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Image alt="" height={24} loading="eager" src={link.iconUrl || fallbackIcon} width={24} />
                </a>
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

