"use client";

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
const eyeIcon = "/figma/pw2-icon-eye.svg";
const likeIcon = "/figma/pw2-icon-like.svg";

function filterWorks(works: Work[], filter: Filter) {
  if (filter.kind === "all") return works;
  if (filter.kind === "type") return works.filter((work) => work.primaryTypeSlug === filter.value || work.primaryType === filter.value || work.category === filter.value);
  return works;
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
  const years = useMemo(() => Array.from(new Set(works.map((work) => work.year))).sort((left, right) => right - left), [works]);
  const filteredWorks = useMemo(() => filterWorks(works, filter), [works, filter]);
  const visibleTypes = workTypes.filter((type) => type.filterVisible && type.status !== "Archived");

  function setActiveFilter(nextFilter: Filter) {
    setFilter(nextFilter);
    const params = new URLSearchParams();
    if (nextFilter.kind !== "all") params.set(nextFilter.kind, nextFilter.value);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/works?${query}` : "/works");
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
            {visibleTypes.map((type) => (
              <button className={`pw-category-row${filter.kind === "type" && filter.value === type.slug ? " is-active" : ""}`} key={type.id} onClick={() => setActiveFilter({ kind: "type", value: type.slug })} type="button">
                <span>
                  <CascadeText text={type.shortLabel || type.nameEn} underline={false} />
                </span>
                <span>/ {type.workCount}</span>
              </button>
            ))}
          </div>

          <h1 className="pw-works-title">
            {title}
            <br />
            &copy; {years.length > 0 ? `${Math.min(...years)}-${Math.max(...years)}` : "2020-2026"}
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
                <Link className="pw-works-grid-card" href={`/works/${work.slug}`} key={work.id} title={work.intro}>
                  <Image alt={work.cover.alt || work.title} height={400} priority={index < 3} src={work.cover.src} width={400} />
                  <span className="pw-works-grid-meta">
                    <strong>{work.title}</strong>
                    <span>{work.primaryType || work.category}</span>
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
                      <span className="pw-list-separator" aria-hidden="true">·</span>
                      <span className="pw-list-stat">
                        <Image alt="" height={16} src={eyeIcon} width={16} />
                        {metricLabel(work.viewCount)}
                      </span>
                      <span className="pw-list-separator" aria-hidden="true">·</span>
                      <span className="pw-list-stat">
                        <Image alt="" height={16} src={likeIcon} width={16} />
                        {metricLabel(work.likeCount)}
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
