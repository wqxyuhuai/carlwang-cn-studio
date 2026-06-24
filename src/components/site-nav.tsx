"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/works", label: "Works" },
  { href: "/about", label: "About" },
  { href: "/about#contact", label: "Contact" }
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="nav-shell">
      <Link href="/" aria-label="Carl Wang Studio home">
        <span className="mark-square" aria-hidden="true" />
      </Link>
      <nav className="nav-links" aria-label="Primary navigation">
        {navItems.map((item) => {
          const active = item.href.includes("#") ? false : item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link aria-current={active ? "page" : undefined} className="nav-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
