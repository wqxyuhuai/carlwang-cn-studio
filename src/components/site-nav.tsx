import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/works", label: "Works" },
  { href: "/about", label: "About" },
  { href: "/about#contact", label: "Contact" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-bg)_86%,transparent)] backdrop-blur-xl">
      <nav className="page-shell flex h-16 items-center justify-between gap-5">
        <Link href="/" className="eyebrow whitespace-nowrap">
          Carl Wang Studio
        </Link>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-ink)] focus-visible:bg-[var(--color-accent)] focus-visible:text-[var(--color-accent-ink)] focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
