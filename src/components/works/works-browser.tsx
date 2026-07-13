"use client";

import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CascadeText } from "@/components/cascade-text";
import type { Work } from "@/lib/types";
import type { PublicWorkType } from "@/lib/public-content";
import {
  lastWorksHrefKey,
  rememberLastWorksHref,
  rememberWorkNavigation,
  rememberWorkReturnHref,
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
  const worksRightRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [filter, setFilter] = useState<Filter>({ kind: "all", value: "All" });
  const filteredWorks = useMemo(() => filterWorks(works, filter), [works, filter]);
  const visibleYears = useMemo(() => {
    const yearSource = filteredWorks.length > 0 ? filteredWorks : works;
    return Array.from(new Set(yearSource.map((work) => Number(work.year)).filter((year) => Number.isFinite(year)))).sort((left, right) => left - right);
  }, [filteredWorks, works]);
  const visibleTypes = useMemo(() => workTypes.filter((type) => type.filterVisible && type.status !== "Archived"), [workTypes]);
  const visibleTypedTypes = useMemo(() => visibleTypes.map((type) => ({ type, count: works.filter((work) => matchesType(work, type.slug)).length })).filter((entry) => entry.count > 0), [visibleTypes, works]);

  useEffect(() => {
    if (basePath !== "/") return;

    function syncFromLocation() {
      setMode(initialModeFromLocation(initialMode));
      setFilter(initialFilterFromLocation());
    }

    syncFromLocation();
    window.addEventListener("cw:works-browser-sync", syncFromLocation);
    return () => window.removeEventListener("cw:works-browser-sync", syncFromLocation);
  }, [basePath, initialMode]);

  useEffect(() => {
    const page = pageRef.current;
    const worksRight = worksRightRef.current;
    if (!page || !worksRight) return;
    const scrollTarget = worksRight;

    function forwardWheelToWorks(event: WheelEvent) {
      if (event.ctrlKey || scrollTarget.contains(event.target as Node)) return;
      if (getComputedStyle(scrollTarget).overflowY === "visible" || scrollTarget.scrollHeight <= scrollTarget.clientHeight) return;

      const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? event.deltaY * 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? event.deltaY * scrollTarget.clientHeight
          : event.deltaY;
      const maxScrollTop = scrollTarget.scrollHeight - scrollTarget.clientHeight;
      const nextScrollTop = Math.max(0, Math.min(maxScrollTop, scrollTarget.scrollTop + delta));

      if (nextScrollTop === scrollTarget.scrollTop) return;
      event.preventDefault();
      scrollTarget.scrollTop = nextScrollTop;
    }

    page.addEventListener("wheel", forwardWheelToWorks, { passive: false });
    return () => page.removeEventListener("wheel", forwardWheelToWorks);
  }, []);

  function browserHref(nextFilter: Filter, nextMode: ViewMode) {
    const params = new URLSearchParams();
    if (nextFilter.kind !== "all") params.set(nextFilter.kind, nextFilter.value);
    params.set("view", nextMode);
    const query = params.toString();
    const hash = basePath === "/" ? "#works-index" : "";
    return `${basePath}${query ? `?${query}` : ""}${hash}`;
  }

  function rememberBrowserHref(nextFilter: Filter, nextMode: ViewMode) {
    if (basePath !== "/") return;
    rememberLastWorksHref(browserHref(nextFilter, nextMode));
  }

  function replaceBrowserHref(nextFilter: Filter, nextMode: ViewMode) {
    const nextHref = browserHref(nextFilter, nextMode);
    window.history.replaceState(null, "", nextHref);
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

  function rememberCurrentWorkReturnHref(markHistoryEntry = true) {
    const returnHref = browserHref(filter, mode);
    if (markHistoryEntry) {
      rememberWorkNavigation(returnHref);
    } else {
      rememberWorkReturnHref(returnHref);
    }
    rememberBrowserHref(filter, mode);
  }

  function workDetailHref(slug: string) {
    return workDetailHrefWithReturn(`/works/${slug}`, browserHref(filter, mode));
  }

  function prefetchWorkDetail(slug: string) {
    const href = workDetailHref(slug);
    if (prefetchedDetailHrefs.current.has(href)) return;
    prefetchedDetailHrefs.current.add(href);
    router.prefetch(href);
  }

  function shouldUseNativeLink(event: MouseEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>) {
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  }

  function usesCoarsePointer() {
    return typeof window !== "undefined" && window.matchMedia("(hover: none), (pointer: coarse)").matches;
  }

  function beginWorkNavigation(slug: string) {
    const href = workDetailHref(slug);
    if (pendingDetailHrefRef.current === href) return;

    pendingDetailHrefRef.current = href;
    rememberCurrentWorkReturnHref();
    prefetchWorkDetail(slug);
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

    if (usesCoarsePointer()) {
      rememberCurrentWorkReturnHref();
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
            &copy; {visibleYears.length > 0 ? `${visibleYears[0]}-${visibleYears[visibleYears.length - 1]}` : ""}
          </h1>
        </aside>

        <div className="pw-works-right" ref={worksRightRef}>
          {showViewToggle ? (
            <div className="pw-view-toggle" aria-label="Works view">
            <button aria-label="Show works as grid" className={mode === "grid" ? "is-active" : undefined} onClick={() => setActiveMode("grid")} type="button">
              <Image alt="" height={20} src={gridIcon} width={20} />
              Grid
            </button>
            <button aria-label="Show works as list" className={mode === "list" ? "is-active" : undefined} onClick={() => setActiveMode("list")} type="button">
              <Image alt="" height={20} src={listIcon} width={20} />
              List
            </button>
          </div>
          ) : null}

              {filteredWorks.length === 0 ? (
                <p className="pw-works-empty">No published works match this filter.</p>
              ) : mode === "grid" ? (
                <div className="pw-works-grid">
                  {filteredWorks.map((work, index) => (
                    <Link
                      className="pw-works-grid-card"
                      href={workDetailHref(work.slug)}
                      key={work.id}
                      onClick={(event) => handleWorkClick(event, work.slug)}
                      onFocus={() => prefetchWorkDetail(work.slug)}
                      onPointerDown={(event) => handleWorkPointerDown(event, work.slug)}
                      onPointerEnter={() => prefetchWorkDetail(work.slug)}
                      prefetch={false}
                      style={gridCardEntryStyle(index)}
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
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
            <div className="pw-works-list">
              {filteredWorks.map((work) => (
                <Link
                  className="pw-list-row"
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
    </section>
  );
}
