"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/works", label: "Works" },
  { href: "/about", label: "About" },
  { href: "/about#contact", label: "Contact" }
];

export function SiteNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const applyTheme = (selectedTheme: "light" | "dark", persist = true) => {
      setTheme(selectedTheme);
      document.documentElement.dataset.theme = selectedTheme;
      if (persist) {
        window.localStorage.setItem("theme", selectedTheme);
      }
    };
    const storedTheme = window.localStorage.getItem("theme");
    const initialTheme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : isHome || window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    applyTheme(initialTheme, false);
  }, [isHome]);

  useEffect(() => {
    const updateScrolledState = () => {
      const scrollContainers = document.querySelectorAll(".pw-works-right, .pw-detail-right");
      const hasScrolledContainer = Array.from(scrollContainers).some((container) => container.scrollTop > 8);

      setIsScrolled(window.scrollY > 8 || hasScrolledContainer);
    };

    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });
    document.addEventListener("scroll", updateScrolledState, true);

    return () => {
      window.removeEventListener("scroll", updateScrolledState);
      document.removeEventListener("scroll", updateScrolledState, true);
    };
  }, []);

  const activeTheme = theme;
  const nextTheme = activeTheme === "dark" ? "light" : "dark";
  const switchTheme = () => {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("theme", nextTheme);
  };
  const glassFilter =
    activeTheme === "dark"
      ? "blur(12px) brightness(1.08) saturate(1.28) contrast(1.03)"
      : "blur(12px) brightness(1.12) saturate(1.34) contrast(1.02)";
  const glassStyle: CSSProperties = {
    backdropFilter: glassFilter,
    WebkitBackdropFilter: glassFilter
  };

  return (
    <header className={`nav-shell glass-surface ${isScrolled ? "is-scrolled" : ""}`} data-tone={activeTheme} style={glassStyle}>
      <span className="glass-surface-effect" style={glassStyle} aria-hidden="true" />
      <Link href="/" aria-label="Carl Wang Studio home">
        <span className="mark-square" aria-hidden="true" />
      </Link>
      <div className="nav-actions">
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
        <button
          aria-label={`Switch to ${nextTheme} mode`}
          className="theme-toggle"
          data-theme-mode={activeTheme}
          onClick={switchTheme}
          type="button"
        >
          {activeTheme === "dark" ? (
            <svg aria-hidden="true" className="theme-icon" fill="none" viewBox="0 0 24 24">
              <path d="M20 15.6A8.5 8.5 0 0 1 8.4 4 7 7 0 1 0 20 15.6Z" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="theme-icon" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
