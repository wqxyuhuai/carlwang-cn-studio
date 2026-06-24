import Link from "next/link";
import Image from "next/image";

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/", icon: "/figma/footer-social-instagram.svg" },
  { label: "LinkedIn", href: "https://www.linkedin.com/", icon: "/figma/footer-social-linkedin.svg" },
  { label: "X", href: "https://x.com/", icon: "/figma/footer-social-x.svg" }
];

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
    title: "Links",
    links: [
      { label: "Behance", href: "https://www.behance.net/" },
      { label: "Zcool", href: "https://www.zcool.com.cn/" },
      { label: "Xiaohongshu", href: "https://www.xiaohongshu.com/" }
    ]
  },
  {
    title: "Contact",
    links: [
      { label: "Contact", href: "/about#contact" },
      { label: "Email", href: "mailto:hello@carlwang.cn" },
      { label: "Works", href: "/works" }
    ]
  }
];

export function FooterNavigation() {
  return (
    <footer className="pw-footer">
      <div className="pw-footer-brand">
        <div>
          <div className="pw-footer-logo" aria-label="Carl Wang Studio">
            <span>Carl Wang</span>
            <span>Studio</span>
          </div>
          <p className="caption-copy text-muted footer-copy">
            A designer working across visual, digital and spatial systems.
          </p>
          <div className="pw-footer-socials" aria-label="Social links">
            {socialLinks.map((link) => (
              <a
                aria-label={link.label}
                className="pw-social-icon"
                href={link.href}
                key={link.label}
                rel="noreferrer"
                target="_blank"
              >
                <Image alt="" height={24} loading="eager" src={link.icon} width={24} />
              </a>
            ))}
          </div>
        </div>
        <p className="caption-copy pw-footer-copy">Built with care.</p>
      </div>

      <div className="pw-footer-right">
        <nav className="pw-footer-nav" aria-label="Footer navigation">
          {footerGroups.map((group) => (
            <div className="pw-footer-group" key={group.title}>
              <strong className="caption-copy">{group.title}</strong>
              {group.links.map((link) =>
                link.href.startsWith("http") || link.href.startsWith("mailto:") ? (
                  <a
                    className="caption-copy"
                    href={link.href}
                    key={link.label}
                    rel={link.href.startsWith("mailto:") ? undefined : "noreferrer"}
                    target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link className="caption-copy" href={link.href} key={link.label}>
                    {link.label}
                  </Link>
                )
              )}
            </div>
          ))}
        </nav>
        <p className="caption-copy pw-footer-copy">&copy; Carl Wang. All rights reserved.</p>
      </div>
    </footer>
  );
}
