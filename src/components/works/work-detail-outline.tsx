"use client";

import type { CSSProperties, FocusEvent, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { LiquidGlassFilter, useLiquidGlassSurface } from "@/components/liquid-glass-surface";
import type { NotionHeadingEntry } from "@/components/notion/notion-renderer";

const CLOSE_DELAY_MS = 220;
const subscribePortalRoot = () => () => {};
const getPortalRoot = () => document.body;
const getServerPortalRoot = () => null;

function headingLevelStyle(level: number) {
  return { "--outline-level": String(Math.min(4, Math.max(1, level))) } as CSSProperties;
}

export function WorkDetailOutline({ headings }: { headings: NotionHeadingEntry[] }) {
  const entries = useMemo(() => headings.filter((heading) => heading.text.trim()), [headings]);
  const [activeId, setActiveId] = useState(entries[0]?.id || "");
  const [isListScrollable, setIsListScrollable] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const glassSurface = useLiquidGlassSurface(panelRef);
  const portalRoot = useSyncExternalStore(subscribePortalRoot, getPortalRoot, getServerPortalRoot);

  useEffect(() => {
    if (entries.length < 2) return;
    if (window.matchMedia("(max-width: 900px), (pointer: coarse)").matches) return;

    const scrollRoot = document.querySelector<HTMLElement>(".pw-detail-right");
    if (!scrollRoot) return;

    const headingElements = entries
      .map((entry) => ({ entry, element: document.getElementById(entry.id) }))
      .filter((item): item is { entry: NotionHeadingEntry; element: HTMLElement } => Boolean(item.element));
    if (headingElements.length === 0) return;

    let frameId = 0;

    const updateActiveHeading = () => {
      const rootRect = scrollRoot.getBoundingClientRect();
      const activationLine = rootRect.top + Math.min(rootRect.height * 0.12, 120);
      let nextActiveId = headingElements[0].entry.id;

      for (const item of headingElements) {
        if (item.element.getBoundingClientRect().top <= activationLine) nextActiveId = item.entry.id;
        else break;
      }

      if (scrollRoot.scrollTop + scrollRoot.clientHeight >= scrollRoot.scrollHeight - 2) {
        nextActiveId = headingElements.at(-1)?.entry.id || nextActiveId;
      }

      setActiveId((current) => current === nextActiveId ? current : nextActiveId);
    };

    const scheduleActiveHeadingUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateActiveHeading);
    };

    scheduleActiveHeadingUpdate();
    scrollRoot.addEventListener("scroll", scheduleActiveHeadingUpdate, { passive: true });
    window.addEventListener("resize", scheduleActiveHeadingUpdate);

    return () => {
      window.cancelAnimationFrame(frameId);
      scrollRoot.removeEventListener("scroll", scheduleActiveHeadingUpdate);
      window.removeEventListener("resize", scheduleActiveHeadingUpdate);
    };
  }, [entries]);

  useEffect(() => {
    if (!isOpen || !activeId) return;
    const list = listRef.current;
    const activeLink = list?.querySelector<HTMLElement>(`[data-outline-id="${CSS.escape(activeId)}"]`);
    if (!list || !activeLink) return;

    const itemTop = activeLink.offsetTop;
    const itemBottom = itemTop + activeLink.offsetHeight;
    const visibleTop = list.scrollTop;
    const visibleBottom = visibleTop + list.clientHeight;

    if (itemTop < visibleTop) list.scrollTop = itemTop;
    else if (itemBottom > visibleBottom) list.scrollTop = itemBottom - list.clientHeight;
  }, [activeId, isOpen]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    let frameId = 0;
    const updateScrollableState = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const nextScrollable = list.scrollHeight > list.clientHeight + 1;
        setIsListScrollable((current) => current === nextScrollable ? current : nextScrollable);
      });
    };

    updateScrollableState();
    const resizeObserver = new ResizeObserver(updateScrollableState);
    resizeObserver.observe(list);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [entries, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  if (entries.length < 2) return null;

  function openOutline() {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    setIsOpen(true);
  }

  function scheduleCloseOutline() {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    scheduleCloseOutline();
  }

  function handleRailFocus(event: FocusEvent<HTMLButtonElement>) {
    if (event.currentTarget.matches(":focus-visible")) openOutline();
  }

  function jumpToHeading(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
    setActiveId(id);
  }

  const outline = (
    <aside
      aria-label="Page outline"
      className={`pw-detail-outline${isOpen ? " is-open" : ""}${isListScrollable ? " is-scrollable" : ""}`}
      onBlur={handleBlur}
      onMouseEnter={openOutline}
      onMouseLeave={scheduleCloseOutline}
    >
      <button
        aria-expanded={isOpen}
        aria-label="Open page outline"
        className="pw-detail-outline-rail"
        onClick={(event) => {
          if (event.detail === 0) openOutline();
        }}
        onFocus={handleRailFocus}
        type="button"
      >
        <span aria-hidden="true" className="pw-detail-outline-rail-list">
          {entries.map((heading) => (
            <span
              className={`pw-detail-outline-tick${heading.id === activeId ? " is-active" : ""}`}
              key={heading.id}
              style={headingLevelStyle(heading.level)}
            />
          ))}
        </span>
      </button>

      <nav
        aria-hidden={!isOpen}
        aria-label="Page sections"
        className={`pw-detail-outline-panel ${
          glassSurface.supportsSvgFilter ? "cw-bottom-glass-surface--svg" : "cw-bottom-glass-surface--fallback"
        }`}
        onFocus={openOutline}
        ref={panelRef}
        style={glassSurface.style}
      >
        <LiquidGlassFilter surface={glassSurface} />
        <div
          className={`pw-detail-outline-panel-list${isListScrollable ? " is-scrollable" : ""}`}
          ref={listRef}
        >
          {entries.map((heading) => (
            <a
              className={`pw-detail-outline-link${heading.id === activeId ? " is-active" : ""}`}
              data-outline-id={heading.id}
              href={`#${heading.id}`}
              key={heading.id}
              onClick={(event) => jumpToHeading(event, heading.id)}
              style={headingLevelStyle(heading.level)}
              tabIndex={isOpen ? 0 : -1}
            >
              {heading.text}
            </a>
          ))}
        </div>
      </nav>
    </aside>
  );

  return portalRoot ? createPortal(outline, portalRoot) : null;
}
