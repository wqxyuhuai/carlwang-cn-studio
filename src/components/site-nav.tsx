"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const [navOnDark, setNavOnDark] = useState(isHome);
  const [themeRotation, setThemeRotation] = useState(0);
  const headerRef = useRef<HTMLElement | null>(null);
  const isScrolledRef = useRef(false);

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
    const scrollContainers = Array.from(document.querySelectorAll<HTMLElement>(".pw-works-right, .pw-detail-right"));
    let frame = 0;

    const updateScrolledState = () => {
      frame = 0;
      const hasScrolledContainer = scrollContainers.some((container) => container.scrollTop > 1);
      const nextScrolled = window.scrollY > 1 || hasScrolledContainer;

      if (isScrolledRef.current !== nextScrolled) {
        isScrolledRef.current = nextScrolled;
        setIsScrolled(nextScrolled);
      }
    };

    const scheduleScrolledState = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(updateScrolledState);
      }
    };

    updateScrolledState();
    window.addEventListener("scroll", scheduleScrolledState, { passive: true });
    scrollContainers.forEach((container) => container.addEventListener("scroll", scheduleScrolledState, { passive: true }));

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleScrolledState);
      scrollContainers.forEach((container) => container.removeEventListener("scroll", scheduleScrolledState));
    };
  }, [pathname]);

  useEffect(() => {
    let frame = 0;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = 1;
    canvas.height = 1;

    const colorLuminance = (value: string) => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const [r, g, b, a = 1] = match[1].split(",").map((part) => Number.parseFloat(part));
      if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b) || a < 0.08) return null;
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    };

    const mediaLuminance = (element: Element, x: number, y: number) => {
      if (!context) return null;
      const image = element instanceof HTMLImageElement ? element : null;
      const video = element instanceof HTMLVideoElement ? element : null;
      if (!image && !video) return null;

      const sourceWidth = image ? image.naturalWidth : video?.videoWidth || 0;
      const sourceHeight = image ? image.naturalHeight : video?.videoHeight || 0;
      const rect = element.getBoundingClientRect();
      if (!sourceWidth || !sourceHeight || rect.width <= 0 || rect.height <= 0) return null;

      const style = window.getComputedStyle(element);
      const coverScale = style.objectFit === "cover" ? Math.max(rect.width / sourceWidth, rect.height / sourceHeight) : null;
      const containScale =
        style.objectFit === "contain" || style.objectFit === "scale-down"
          ? Math.min(rect.width / sourceWidth, rect.height / sourceHeight)
          : null;
      const scale = coverScale ?? containScale ?? 1;
      const renderedWidth = sourceWidth * scale;
      const renderedHeight = sourceHeight * scale;
      const localX = x - rect.left - (rect.width - renderedWidth) / 2;
      const localY = y - rect.top - (rect.height - renderedHeight) / 2;
      if (localX < 0 || localY < 0 || localX > renderedWidth || localY > renderedHeight) return null;

      try {
        const sx = Math.min(sourceWidth - 1, Math.max(0, Math.floor((localX / renderedWidth) * sourceWidth)));
        const sy = Math.min(sourceHeight - 1, Math.max(0, Math.floor((localY / renderedHeight) * sourceHeight)));
        context.clearRect(0, 0, 1, 1);
        context.drawImage(element as CanvasImageSource, sx, sy, 1, 1, 0, 0, 1, 1);
        const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
        if (a < 20) return null;
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      } catch {
        return 0.26;
      }
    };

    const sampleAt = (x: number, y: number, overlay: HTMLElement) => {
      for (const element of document.elementsFromPoint(x, y)) {
        if (overlay.contains(element)) continue;
        const media = mediaLuminance(element, x, y);
        if (media !== null) return media;
        const background = colorLuminance(window.getComputedStyle(element).backgroundColor);
        if (background !== null) return background;
      }
      return null;
    };

    const updateTone = () => {
      frame = 0;
      const overlay = headerRef.current;
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();
      const samples: number[] = [];
      for (const yRatio of [0.35, 0.55, 0.75]) {
        for (const xRatio of [0.08, 0.18, 0.32, 0.46, 0.6, 0.74, 0.88]) {
          const value = sampleAt(rect.left + rect.width * xRatio, rect.top + rect.height * yRatio, overlay);
          if (value !== null) samples.push(value);
        }
      }
      if (!samples.length) {
        setNavOnDark(theme === "dark");
        return;
      }
      const darkVotes = samples.filter((value) => value < 0.5).length;
      const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      setNavOnDark(darkVotes / samples.length >= 0.45 || average < 0.48);
    };

    const scheduleTone = () => {
      if (frame === 0) frame = window.requestAnimationFrame(updateTone);
    };

    scheduleTone();
    window.addEventListener("scroll", scheduleTone, { passive: true });
    window.addEventListener("resize", scheduleTone);
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleTone);
      window.removeEventListener("resize", scheduleTone);
    };
  }, [pathname, theme]);

  const activeTheme = theme;
  const nextTheme = activeTheme === "dark" ? "light" : "dark";
  const switchTheme = () => {
    setTheme(nextTheme);
    setThemeRotation((current) => current + 180);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("theme", nextTheme);
  };

  return (
    <header
      className={`cw-glass-header ${isScrolled ? "is-scrolled" : ""} ${navOnDark ? "is-on-dark" : "is-on-light"}`}
      ref={headerRef}
    >
      <nav className="cw-glass-wrapper" aria-label="Primary navigation">
        <span className="cw-glass-effect" aria-hidden="true" />
        <div className="cw-glass-content">
          <Link className="cw-brand" href="/" aria-label="Carl Wang Studio home">
            <span className="cw-brand-mark" aria-hidden="true" />
          </Link>
          <div className="cw-nav-links">
            {navItems.map((item) => {
              const active = item.href.includes("#") ? false : item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link aria-current={active ? "page" : undefined} className={`cw-nav-link ${active ? "is-active" : ""}`} href={item.href} key={item.href}>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="cw-nav-tools">
            <button
              aria-label={`Switch to ${nextTheme} mode`}
              className="cw-theme-toggle"
              data-theme-mode={activeTheme}
              onClick={switchTheme}
              type="button"
            >
              <span
                className="cw-theme-mode-icon"
                aria-hidden="true"
                style={{ transform: `rotate(${themeRotation}deg)` }}
              />
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
