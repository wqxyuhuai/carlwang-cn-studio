"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Work } from "@/lib/types";

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
    <section className="framed-page page-enter relative overflow-hidden px-5 pb-8 pt-24 md:px-10">
      <div className="grid min-h-[calc(100dvh-8rem)] grid-rows-[auto_1fr_auto]">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] uppercase text-[var(--color-muted)]">
              {categories.map((item) => (
                <button
                  key={item}
                  className={`relative pb-1 transition hover:text-[var(--color-ink)] focus-visible:outline-none ${category === item ? "text-[var(--color-ink)] after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-[var(--color-accent)]" : ""}`}
                  type="button"
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] uppercase text-[var(--color-muted)]">
              {years.map((item) => (
                <button
                  key={item}
                  className={`relative pb-1 transition hover:text-[var(--color-ink)] focus-visible:outline-none ${year === item ? "text-[var(--color-ink)] after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-[var(--color-accent)]" : ""}`}
                  type="button"
                  onClick={() => setYear(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="flex h-fit items-center gap-3 text-[11px] uppercase text-[var(--color-muted)]">
            {(["grid", "list"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`relative pb-1 transition hover:text-[var(--color-ink)] focus-visible:outline-none ${viewMode === mode ? "text-[var(--color-ink)] after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-[var(--color-accent)]" : ""}`}
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="grid place-items-center">
            <div className="max-w-xl text-center">
              <p className="eyebrow text-[var(--color-muted)]">Empty state</p>
              <h2 className="mt-8 text-5xl uppercase leading-none">No works match this filter.</h2>
              <button
                type="button"
                className="underlined-link mt-8 text-sm uppercase"
                onClick={() => {
                  setCategory("All");
                  setYear("All");
                }}
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="relative min-h-[62dvh]">
            {filtered.map((work, index) => {
              const placements = [
                "right-[3%] top-[17%] w-[22%]",
                "right-[25%] top-[34%] w-[17%]",
                "right-[8%] top-[49%] w-[16%]",
                "right-[43%] top-[48%] w-[16%]",
                "right-[24%] top-[7%] w-[14%]",
                "right-[0%] top-[2%] w-[13%]",
              ];
              return (
                <Link
                  href={`/works/${work.slug}`}
                  key={work.slug}
                  className={`group float-in absolute min-w-[130px] overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface)] transition duration-500 ease-[var(--ease-out)] hover:z-20 hover:-translate-y-2 hover:border-[var(--color-accent)] ${placements[index % placements.length]}`}
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <span className="relative block aspect-square overflow-hidden">
                    <Image src={work.coverImage.src} alt={work.coverImage.alt} fill priority={index < 3} className="image-lift object-cover" sizes="24vw" />
                    <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/45" />
                    <span className="absolute bottom-3 left-3 right-3 translate-y-3 text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <span className="block text-xl uppercase leading-none">{work.title}</span>
                      <span className="mt-2 block font-mono text-[10px] uppercase">
                        {work.year} / {work.category}
                      </span>
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-5xl self-center border-t border-[var(--color-line)]">
            {filtered.map((work) => (
              <Link
                href={`/works/${work.slug}`}
                key={work.slug}
                className="group grid gap-4 border-b border-[var(--color-line)] py-5 transition hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] md:grid-cols-[1.2fr_0.5fr_0.7fr_1.2fr_88px]"
              >
                <strong className="text-2xl uppercase leading-none">{work.title}</strong>
                <span className="text-sm text-[var(--color-muted)]">{work.year}</span>
                <span className="text-sm text-[var(--color-muted)]">{work.category}</span>
                <span className="text-sm leading-6 text-[var(--color-muted)]">{work.intro}</span>
                <span className="relative hidden aspect-square overflow-hidden border border-[var(--color-line)] md:block">
                  <Image src={work.coverImage.src} alt={work.coverImage.alt} fill className="object-cover opacity-70 transition group-hover:opacity-100" sizes="88px" />
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
          <h1 className="poster-type text-[clamp(5rem,14vw,13rem)] lowercase">works</h1>
          <p className="max-w-xs pb-5 text-xs leading-5 text-[var(--color-muted)]">
            {filtered.length} selected cases. Filter by category or year, then switch between spatial grid and scan list.
          </p>
        </div>
      </div>
    </section>
  );
}
