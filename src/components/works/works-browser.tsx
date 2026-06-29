"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { CascadeText } from "@/components/cascade-text";
import type { Work } from "@/lib/types";
import type { PublicWorkType } from "@/lib/public-content";
import { metricLabel, workPublishedLabel } from "@/lib/work-metrics";

type ViewMode = "grid" | "list";
type FilterKind = "all" | "type";
type Filter = {
  kind: FilterKind;
  value: string;
};

const gridIcon = "/figma/pw2-icon-grid.svg?v=2";
const listIcon = "/figma/pw2-icon-list.svg?v=2";

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

export function WorksBrowser({ works, workTypes, title }: { works: Work[]; workTypes: PublicWorkType[]; title: string }) {
  const [mode, setMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<Filter>(initialFilterFromLocation);
  const filteredWorks = useMemo(() => filterWorks(works, filter), [works, filter]);
  const visibleYears = useMemo(() => {
    const yearSource = filteredWorks.length > 0 ? filteredWorks : works;
    return Array.from(new Set(yearSource.map((work) => Number(work.year)).filter((year) => Number.isFinite(year)))).sort((left, right) => left - right);
  }, [filteredWorks, works]);
  const visibleTypes = useMemo(() => workTypes.filter((type) => type.filterVisible && type.status !== "Archived"), [workTypes]);
  const visibleTypedTypes = useMemo(() => visibleTypes.map((type) => ({ type, count: works.filter((work) => matchesType(work, type.slug)).length })).filter((entry) => entry.count > 0), [visibleTypes, works]);

  function setActiveFilter(nextFilter: Filter) {
    setFilter(nextFilter);
    const params = new URLSearchParams();
    if (nextFilter.kind !== "all") params.set(nextFilter.kind, nextFilter.value);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/works?${query}` : "/works");
  }

  function gridCardEntryStyle(index: number) {
    const desktopColumnCount = 3;
    const row = Math.floor(index / desktopColumnCount);
    const column = index % desktopColumnCount;
    const delay = 120 + (row + column) * 64 + row * 18;

    return { "--works-card-entry-delay": `${delay}ms` } as CSSProperties;
  }

  return (
    <section className="pw-works-page" aria-label="Works">
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

          <h1 className="pw-works-title">
            {title}
            <br />
            &copy; {visibleYears.length > 0 ? `${visibleYears[0]}-${visibleYears[visibleYears.length - 1]}` : ""}
          </h1>
        </aside>

        <div className="pw-works-right">
            <div className="pw-view-toggle" aria-label="Works view">
            <button aria-label="Show works as grid" className={mode === "grid" ? "is-active" : undefined} onClick={() => setMode("grid")} type="button">
              <Image alt="" height={20} src={gridIcon} width={20} />
              Grid
            </button>
            <button aria-label="Show works as list" className={mode === "list" ? "is-active" : undefined} onClick={() => setMode("list")} type="button">
              <Image alt="" height={20} src={listIcon} width={20} />
              List
            </button>
          </div>

              {filteredWorks.length === 0 ? (
                <p className="pw-works-empty">No published works match this filter.</p>
              ) : mode === "grid" ? (
                <div className="pw-works-grid">
                  {filteredWorks.map((work, index) => (
                    <Link className="pw-works-grid-card" href={`/works/${work.slug}`} key={work.id} style={gridCardEntryStyle(index)} title={work.intro}>
                      <span className="pw-works-grid-card-inner">
                        <span className="pw-works-grid-card-face pw-works-grid-card-front">
                          <Image alt={work.cover.alt || work.title} height={400} priority={index < 3} src={work.cover.src} width={400} />
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
                <Link className="pw-list-row" href={`/works/${work.slug}`} key={work.id}>
                  <span className="pw-list-image">
                    <Image alt={work.cover.alt || work.title} height={400} src={work.cover.src} width={400} />
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
