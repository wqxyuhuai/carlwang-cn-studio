"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CascadeText } from "@/components/cascade-text";
import { WorkScrollTop } from "@/components/works/work-scroll-top";
import type { Work } from "@/lib/types";
import type { PublicWorkType } from "@/lib/public-content";
import {
  consumeWorkReturnScroll,
  currentWorkSurfaceHref,
  lastWorksHrefKey,
  rememberLastWorksHref,
  rememberWorkNavigation,
  rememberWorkReturnHref,
  rememberWorkReturnScroll,
  readWorkReturnScroll,
  replaceCurrentHistoryHref,
  workDetailHrefWithReturn
} from "@/lib/work-detail-return";
import { metricLabel, workPublishedLabel } from "@/lib/work-metrics";

type ViewMode = "grid" | "list";
type FilterKind = "all" | "type";
type Filter = {
  kind: FilterKind;
  value: string;
};

const gridIcon = "/figma/pw2-icon-grid.svg?v=3";
const listIcon = "/figma/pw2-icon-list.svg?v=3";

function filterWorks(works: Work[], filter: Filter) {
  if (filter.kind === "all") return works;
  if (filter.kind === "type")
    return works.filter((work) => work.primaryTypeSlug === filter.value || work.primaryType === filter.value || work.category === filter.value);
  return works;
}

function matchesType(work: Work, typeSlug: string) {
  return work.primaryTypeSlug === typeSlug || work.primaryType === typeSlug || work.category === typeSlug;
}

function initialFilterFromLocation(): Filter {
  if (typeof window === "undefined") return { kind: "all", value: "All" };
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  if (type) return { kind: "type", value: type };
  return { kind: "all", value: "All" };
}

function initialModeFromLocation(fallbackMode: ViewMode): ViewMode {
  if (typeof window === "undefined") return fallbackMode;
  const view = new URLSearchParams(window.location.search).get("view");
  return view === "grid" || view === "list" ? view : fallbackMode;
}

function initialSearchFromLocation() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") || "";
}

function normalizedSearchValue(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

export function WorksBrowser({
  basePath = "/works",
  initialMode = "grid",
  showViewToggle = true,
  works,
  workTypes,
  title
}: {
  basePath?: string;
  initialMode?: ViewMode;
  showViewToggle?: boolean;
  works: Work[];
  workTypes: PublicWorkType[];
  title: string;
}) {
  const router = useRouter();
  const pageRef = useRef<HTMLElement>(null);
  const prefetchedDetailHrefs = useRef(new Set<string>());
  const pendingDetailHrefRef = useRef<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const worksRightRef = useRef<HTMLDivElement>(null);
  const searchInputId = useId();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pendingDetailSlug, setPendingDetailSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [filter, setFilter] = useState<Filter>({ kind: "all", value: "All" });
  const filteredWorks = useMemo(() => {
    const worksInFilter = filterWorks(works, filter);
    const normalizedQuery = normalizedSearchValue(searchQuery);
    if (!normalizedQuery) return worksInFilter;

    return worksInFilter.filter((work) => normalizedSearchValue(work.title).includes(normalizedQuery));
  }, [works, filter, searchQuery]);
  const visibleYears = useMemo(() => {
    const yearSource = filteredWorks.length > 0 ? filteredWorks : works;
    return Array.from(new Set(yearSource.map((work) => Number(work.year)).filter((year) => Number.isFinite(year)))).sort((left, right) => left - right);
  }, [filteredWorks, works]);
  const visibleYearLabel = visibleYears.length === 0
    ? ""
    : visibleYears[0] === visibleYears[visibleYears.length - 1]
      ? String(visibleYears[0])
      : `${visibleYears[0]}-${visibleYears[visibleYears.length - 1]}`;
  const visibleTypes = useMemo(() => workTypes.filter((type) => type.filterVisible && type.status !== "Archived"), [workTypes]);
  const visibleTypedTypes = useMemo(() => visibleTypes.map((type) => ({ type, count: works.filter((work) => matchesType(work, type.slug)).length })).filter((entry) => entry.count > 0), [visibleTypes, works]);
  const browserHref = useCallback((nextFilter: Filter, nextMode: ViewMode, nextSearch = "") => {
    const params = new URLSearchParams();
    if (nextFilter.kind !== "all") params.set(nextFilter.kind, nextFilter.value);
    params.set("view", nextMode);
    const normalizedSearch = nextSearch.trim();
    if (normalizedSearch) params.set("q", normalizedSearch);
    const query = params.toString();
    const hash = basePath === "/" ? "#works-index" : "";
    return `${basePath}${query ? `?${query}` : ""}${hash}`;
  }, [basePath]);

  useEffect(() => {
    function syncFromLocation() {
      const nextMode = initialModeFromLocation(initialMode);
      const nextFilter = initialFilterFromLocation();
      const nextSearch = initialSearchFromLocation();
      setMode((current) => current === nextMode ? current : nextMode);
      setFilter((current) => current.kind === nextFilter.kind && current.value === nextFilter.value ? current : nextFilter);
      setSearchQuery(nextSearch);
      setIsSearchOpen(Boolean(nextSearch));
    }

    syncFromLocation();
    if (basePath !== "/") return;
    window.addEventListener("cw:works-browser-sync", syncFromLocation);
    return () => window.removeEventListener("cw:works-browser-sync", syncFromLocation);
  }, [basePath, initialMode]);

  useEffect(() => {
    if (!isSearchOpen) return;
    searchInputRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    const page = pageRef.current;
    const worksRight = worksRightRef.current;
    if (!page || !worksRight) return;
    const scrollTarget = worksRight;
    let pendingWheelDelta = 0;
    let wheelFrame: number | null = null;

    function applyForwardedWheel() {
      wheelFrame = null;
      if (pendingWheelDelta === 0) return;

      const maxScrollTop = scrollTarget.scrollHeight - scrollTarget.clientHeight;
      scrollTarget.scrollTop = Math.max(0, Math.min(maxScrollTop, scrollTarget.scrollTop + pendingWheelDelta));
      pendingWheelDelta = 0;
    }

    function forwardWheelToWorks(event: WheelEvent) {
      if (event.ctrlKey || scrollTarget.contains(event.target as Node)) return;
      if (getComputedStyle(scrollTarget).overflowY === "visible" || scrollTarget.scrollHeight <= scrollTarget.clientHeight) return;

      const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? event.deltaY * 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? event.deltaY * scrollTarget.clientHeight
          : event.deltaY;
      pendingWheelDelta += delta;
      if (wheelFrame === null) {
        wheelFrame = window.requestAnimationFrame(applyForwardedWheel);
      }
    }

    page.addEventListener("wheel", forwardWheelToWorks, { passive: true });
    return () => {
      page.removeEventListener("wheel", forwardWheelToWorks);
      if (wheelFrame !== null) window.cancelAnimationFrame(wheelFrame);
    };
  }, []);

  useLayoutEffect(() => {
    const worksRight = worksRightRef.current;
    const worksSurface = pageRef.current?.closest<HTMLElement>(".cw-work-view");
    if (!worksRight) return;

    const returnHref = browserHref(filter, mode, searchQuery);
    const scrollState = readWorkReturnScroll(returnHref);
    if (!scrollState) return;
    pageRef.current?.classList.add("is-detail-return");
    const scrollTarget = worksRight;
    const savedScroll = scrollState;

    let settledFrame: number | null = null;
    let isCancelled = false;
    const settledTimers: number[] = [];
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    function applyScrollPosition() {
      const panelMax = Math.max(0, scrollTarget.scrollHeight - scrollTarget.clientHeight);
      scrollTarget.scrollTop = Math.min(savedScroll.panelTop, panelMax);
      if (worksSurface) {
        const surfaceMax = Math.max(0, worksSurface.scrollHeight - worksSurface.clientHeight);
        worksSurface.scrollTop = Math.min(savedScroll.surfaceTop, surfaceMax);
      }
      window.scrollTo(0, savedScroll.windowTop);
    }

    applyScrollPosition();
    const firstFrame = window.requestAnimationFrame(() => {
      applyScrollPosition();
      settledFrame = window.requestAnimationFrame(() => {
        applyScrollPosition();
      });
    });
    const resizeObserver = new ResizeObserver(applyScrollPosition);
    resizeObserver.observe(scrollTarget);
    if (worksSurface) resizeObserver.observe(worksSurface);

    [120, 360, 800].forEach((delay) => {
      settledTimers.push(window.setTimeout(applyScrollPosition, delay));
    });
    settledTimers.push(window.setTimeout(() => {
      applyScrollPosition();
      resizeObserver.disconnect();
      consumeWorkReturnScroll(returnHref);
      root.style.scrollBehavior = previousScrollBehavior;
    }, 1200));
    void document.fonts?.ready.then(() => {
      if (!isCancelled) applyScrollPosition();
    });

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(firstFrame);
      if (settledFrame !== null) window.cancelAnimationFrame(settledFrame);
      settledTimers.forEach((timer) => window.clearTimeout(timer));
      resizeObserver.disconnect();
      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, [browserHref, filter, mode, searchQuery]);

  function rememberBrowserHref(nextFilter: Filter, nextMode: ViewMode, nextSearch = searchQuery) {
    if (basePath !== "/") return;
    rememberLastWorksHref(browserHref(nextFilter, nextMode, nextSearch));
  }

  function replaceBrowserHref(nextFilter: Filter, nextMode: ViewMode, nextSearch = searchQuery) {
    const nextHref = browserHref(nextFilter, nextMode, nextSearch);
    replaceCurrentHistoryHref(nextHref);
    if (basePath === "/") {
      rememberLastWorksHref(nextHref);
    }
  }

  function setActiveFilter(nextFilter: Filter) {
    setFilter(nextFilter);
    replaceBrowserHref(nextFilter, mode);
  }

  function setActiveMode(nextMode: ViewMode) {
    setMode(nextMode);
    replaceBrowserHref(filter, nextMode);
  }

  function setActiveSearch(nextSearch: string) {
    setSearchQuery(nextSearch);
    replaceBrowserHref(filter, mode, nextSearch);
  }

  function openSearch() {
    setIsSearchOpen(true);
  }

  function closeSearch() {
    setActiveSearch("");
    setIsSearchOpen(false);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeSearch();
  }

  function rememberCurrentWorkReturnHref(markHistoryEntry = true) {
    const returnHref = browserHref(filter, mode, searchQuery);
    rememberWorkReturnScroll(
      returnHref,
      worksRightRef.current?.scrollTop ?? 0,
      pageRef.current?.closest<HTMLElement>(".cw-work-view")?.scrollTop ?? 0,
      window.scrollY || document.documentElement.scrollTop || 0
    );
    if (markHistoryEntry) {
      rememberWorkNavigation(returnHref);
    } else {
      rememberWorkReturnHref(returnHref);
    }
    rememberBrowserHref(filter, mode, searchQuery);
  }

  const workDetailHref = useCallback((slug: string) => {
    return workDetailHrefWithReturn(`/works/${slug}`, browserHref(filter, mode, searchQuery));
  }, [browserHref, filter, mode, searchQuery]);

  const prefetchDetailHref = useCallback((href: string) => {
    if (prefetchedDetailHrefs.current.has(href)) return;
    prefetchedDetailHrefs.current.add(href);
    router.prefetch(href);
  }, [router]);

  const prefetchWorkDetail = useCallback((slug: string) => {
    prefetchDetailHref(workDetailHref(slug));
  }, [prefetchDetailHref, workDetailHref]);

  useEffect(() => {
    const firstWork = works[0];
    if (!firstWork) return;

    // Warm the shared detail route as soon as the index is interactive. The
    // rest of the first row waits for idle time so large project bodies do not
    // compete with the index page's initial images.
    const returnHref = currentWorkSurfaceHref("#works-index");
    const warmHref = (slug: string) => workDetailHrefWithReturn(`/works/${slug}`, returnHref);
    prefetchDetailHref(warmHref(firstWork.slug));
    const warmCount = window.matchMedia("(max-width: 767px)").matches ? 2 : 3;
    const remainingHrefs = works.slice(1, warmCount).map((work) => warmHref(work.slug));
    if (remainingHrefs.length === 0) return;

    const warmRemaining = () => remainingHrefs.forEach(prefetchDetailHref);
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warmRemaining, { timeout: 900 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = setTimeout(warmRemaining, 240);
    return () => clearTimeout(timer);
  }, [prefetchDetailHref, works]);

  function shouldUseNativeLink(event: MouseEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>) {
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  }

  function beginWorkNavigation(slug: string) {
    const href = workDetailHref(slug);
    if (pendingDetailHrefRef.current === href) return;

    pendingDetailHrefRef.current = href;
    setPendingDetailSlug(slug);
    rememberCurrentWorkReturnHref();
    router.push(href);
  }

  function handleWorkPointerDown(event: PointerEvent<HTMLAnchorElement>, slug: string) {
    if (shouldUseNativeLink(event)) return;
    if (event.pointerType !== "mouse") {
      prefetchWorkDetail(slug);
      return;
    }

    event.preventDefault();
    beginWorkNavigation(slug);
  }

  function handleWorkClick(event: MouseEvent<HTMLAnchorElement>, slug: string) {
    if (shouldUseNativeLink(event)) {
      rememberCurrentWorkReturnHref(false);
      return;
    }

    event.preventDefault();
    beginWorkNavigation(slug);
  }

  const homeTitleStyle = basePath === "/" ? ({ insetBlockEnd: "clamp(5.5rem, 14vh, 9rem)" } as CSSProperties) : undefined;

  function gridCardEntryStyle(index: number) {
    const desktopColumnCount = 3;
    const row = Math.floor(index / desktopColumnCount);
    const column = index % desktopColumnCount;
    const delay = 120 + (row + column) * 64 + row * 18;

    return { "--works-card-entry-delay": `${delay}ms` } as CSSProperties;
  }

  return (
    <section className="pw-works-page" aria-label="Works" ref={pageRef}>
      <div className="pw-works-layout">
        <aside className="pw-works-left">
          <div className="pw-category-list" aria-label="Work filters">
            <button className={`pw-category-row${filter.kind === "all" ? " is-active" : ""}`} onClick={() => setActiveFilter({ kind: "all", value: "All" })} type="button">
              <span>
                <CascadeText text="All" underline={false} />
              </span>
              <span>/ {works.length}</span>
            </button>
            {visibleTypedTypes.map(({ count, type }) => (
              <button className={`pw-category-row${filter.kind === "type" && filter.value === type.slug ? " is-active" : ""}`} key={type.id} onClick={() => setActiveFilter({ kind: "type", value: type.slug })} type="button">
                <span>
                  <CascadeText text={type.shortLabel || type.nameEn} underline={false} />
                </span>
                <span>/ {count}</span>
              </button>
            ))}
          </div>

          <h1 className="pw-works-title" style={homeTitleStyle}>
            {title}
            <br />
            &copy; {visibleYearLabel}
          </h1>
        </aside>

        <div className="pw-works-right" ref={worksRightRef}>
          {showViewToggle ? (
            <div className={`pw-view-toggle${isSearchOpen ? " is-search-open" : ""}`} aria-label="Works view">
              <div className="pw-view-toggle-modes">
                <button aria-label="Show works as grid" className={mode === "grid" ? "is-active" : undefined} onClick={() => setActiveMode("grid")} type="button">
                  <Image alt="" height={20} src={gridIcon} width={20} />
                  Grid
                </button>
                <button aria-label="Show works as list" className={mode === "list" ? "is-active" : undefined} onClick={() => setActiveMode("list")} type="button">
                  <Image alt="" height={20} src={listIcon} width={20} />
                  List
                </button>
              </div>
              <div className="pw-works-search">
                <button
                  aria-controls={searchInputId}
                  aria-expanded={isSearchOpen}
                  aria-label="Search works"
                  className="pw-works-search-trigger"
                  onClick={openSearch}
                  tabIndex={isSearchOpen ? -1 : 0}
                  type="button"
                >
                  <span aria-hidden="true" className="pw-works-search-icon" />
                </button>
                <div aria-hidden={!isSearchOpen} className="cw-liquid-glass-control pw-works-search-panel" role="search">
                  <span aria-hidden="true" className="pw-works-search-icon pw-works-search-icon--leading" />
                  <label className="pw-visually-hidden" htmlFor={searchInputId}>Search works by title</label>
                  <input
                    autoComplete="off"
                    disabled={!isSearchOpen}
                    id={searchInputId}
                    onChange={(event) => setActiveSearch(event.currentTarget.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search titles"
                    ref={searchInputRef}
                    spellCheck={false}
                    type="search"
                    value={searchQuery}
                  />
                  <button
                    aria-label={searchQuery ? "Clear and close search" : "Close search"}
                    className="pw-works-search-close"
                    disabled={!isSearchOpen}
                    onClick={closeSearch}
                    type="button"
                  >
                    <span aria-hidden="true" />
                  </button>
                </div>
              </div>
              <span aria-live="polite" className="pw-visually-hidden">
                {searchQuery.trim() ? `${filteredWorks.length} works found` : ""}
              </span>
            </div>
          ) : null}

              {filteredWorks.length === 0 ? (
                <p className="pw-works-empty">
                  {searchQuery.trim() ? `No works match “${searchQuery.trim()}”.` : "No published works match this filter."}
                </p>
              ) : mode === "grid" ? (
                <div className="pw-works-grid">
                  {filteredWorks.map((work, index) => (
                    <Link
                      aria-busy={pendingDetailSlug === work.slug}
                      className={`pw-works-grid-card${index < 9 ? " is-entry-card" : ""}${pendingDetailSlug === work.slug ? " is-navigating" : ""}`}
                      href={workDetailHref(work.slug)}
                      key={work.id}
                      onClick={(event) => handleWorkClick(event, work.slug)}
                      onFocus={() => prefetchWorkDetail(work.slug)}
                      onPointerDown={(event) => handleWorkPointerDown(event, work.slug)}
                      onPointerEnter={() => prefetchWorkDetail(work.slug)}
                      prefetch={false}
                      style={index < 9 ? gridCardEntryStyle(index) : undefined}
                      title={work.intro}
                    >
                      <span className="pw-works-grid-card-inner">
                        <span className="pw-works-grid-card-face pw-works-grid-card-front">
                          <Image alt={work.cover.alt || work.title} height={400} priority={index < 3} src={work.cover.src} width={400} />
                          {work.featured ? (
                            <span aria-label="Featured work" className="pw-works-featured-mark" role="img">
                              {/* eslint-disable-next-line @next/next/no-img-element -- Fixed-size local SVG icon. */}
                              <img alt="" aria-hidden="true" className="pw-works-featured-mark-icon" src="/figma/pw2-featured-star.svg" />
                            </span>
                          ) : null}
                        </span>
                        <span className="pw-works-grid-card-face pw-works-grid-card-back">
                        <span
                          aria-hidden="true"
                          className="pw-works-grid-card-back-layer"
                        >
                            <Image
                              alt=""
                              className="pw-works-grid-card-back-image"
                              src={work.cover.src}
                              height={400}
                              width={400}
                            />
                          </span>
                          <span className="pw-works-grid-card-back-content">
                            <strong>{work.title}</strong>
                            <span className="pw-works-grid-card-back-meta">{work.primaryType || work.category}</span>
                          </span>
                          {work.featured ? (
                            <span aria-hidden="true" className="pw-works-featured-mark">
                              {/* eslint-disable-next-line @next/next/no-img-element -- Fixed-size local SVG icon. */}
                              <img alt="" aria-hidden="true" className="pw-works-featured-mark-icon" src="/figma/pw2-featured-star.svg" />
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
            <div className="pw-works-list">
              {filteredWorks.map((work) => (
                <Link
                  aria-busy={pendingDetailSlug === work.slug}
                  className={`pw-list-row${pendingDetailSlug === work.slug ? " is-navigating" : ""}`}
                  href={workDetailHref(work.slug)}
                  key={work.id}
                  onClick={(event) => handleWorkClick(event, work.slug)}
                  onFocus={() => prefetchWorkDetail(work.slug)}
                  onPointerDown={(event) => handleWorkPointerDown(event, work.slug)}
                  onPointerEnter={() => prefetchWorkDetail(work.slug)}
                  prefetch={false}
                  >
                  <span className="pw-list-image">
                    <Image alt={work.cover.alt || work.title} height={400} src={work.cover.src} width={400} />
                    {work.featured ? (
                      <span aria-label="Featured work" className="pw-works-featured-mark pw-works-featured-mark--list" role="img">
                        {/* eslint-disable-next-line @next/next/no-img-element -- Fixed-size local SVG icon. */}
                        <img alt="" aria-hidden="true" className="pw-works-featured-mark-icon" src="/figma/pw2-featured-star.svg" />
                      </span>
                    ) : null}
                  </span>
                  <span>
                    <strong className="pw-list-title">{work.title}</strong>
                    <span className="pw-list-meta caption-copy">
                      <span>{workPublishedLabel(work)}</span>
                      <span className="pw-list-separator" aria-hidden="true">&middot;</span>
                      <span className="pw-list-stat">
                        <span className="pw-stat-icon pw-stat-icon-eye" aria-hidden="true" />
                        {metricLabel(work.viewCount)}
                      </span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <WorkScrollTop targetRef={worksRightRef} placement="index" />
    </section>
  );
}
