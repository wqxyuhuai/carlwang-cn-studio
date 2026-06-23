"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Work } from "@/lib/types";
import { WorkCard } from "./work-card";

type ViewMode = "grid" | "list";

export function WorksBrowser({ works }: { works: Work[] }) {
  const categories = useMemo(() => ["All", ...Array.from(new Set(works.map((work) => work.category)))], [works]);
  const years = useMemo(() => ["All", ...Array.from(new Set(works.map((work) => work.year)))], [works]);
  const [category, setCategory] = useState("All");
  const [year, setYear] = useState("All");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const filtered = works.filter((work) => {
    return (category === "All" || work.category === category) && (year === "All" || work.year === year);
  });

  return (
    <section className="page-shell pb-24">
      <div className="mb-8 grid gap-4 border-y border-[var(--color-line)] py-4 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              className={`btn min-h-10 px-3 py-2 text-sm ${category === item ? "btn-primary" : ""}`}
              type="button"
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {years.map((item) => (
            <button
              key={item}
              className={`btn min-h-10 px-3 py-2 text-sm ${year === item ? "btn-primary" : ""}`}
              type="button"
              onClick={() => setYear(item)}
            >
              {item}
            </button>
          ))}
          <div className="ml-0 flex border border-[var(--color-line)] lg:ml-3">
            {(["grid", "list"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`px-4 py-2 text-sm uppercase ${viewMode === mode ? "bg-[var(--color-ink)] text-[var(--color-bg)]" : ""}`}
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="surface min-h-72 p-8">
          <p className="eyebrow text-[var(--color-muted)]">Empty state</p>
          <h2 className="mt-8 max-w-xl text-4xl uppercase leading-none">No works match this filter.</h2>
          <button
            type="button"
            className="btn mt-8"
            onClick={() => {
              setCategory("All");
              setYear("All");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-5 md:grid-cols-6">
          {filtered.map((work, index) => (
            <WorkCard
              key={work.slug}
              work={work}
              priority={index < 2}
              className={index % 5 === 0 ? "md:col-span-3" : index % 5 === 1 ? "md:col-span-2 md:mt-16" : "md:col-span-2"}
            />
          ))}
        </div>
      ) : (
        <div className="border-t border-[var(--color-line)]">
          {filtered.map((work) => (
            <Link
              href={`/works/${work.slug}`}
              key={work.slug}
              className="group grid gap-4 border-b border-[var(--color-line)] py-5 transition hover:bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] md:grid-cols-[1.4fr_0.7fr_0.7fr_1.6fr_120px]"
            >
              <strong className="text-2xl uppercase leading-none">{work.title}</strong>
              <span className="text-[var(--color-muted)]">{work.year}</span>
              <span className="text-[var(--color-muted)]">{work.category}</span>
              <span className="text-sm leading-6 text-[var(--color-muted)]">{work.intro}</span>
              <span className="relative hidden aspect-square overflow-hidden border border-[var(--color-line)] md:block">
                <Image src={work.coverImage.src} alt={work.coverImage.alt} fill className="object-cover opacity-70 transition group-hover:opacity-100" sizes="120px" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
