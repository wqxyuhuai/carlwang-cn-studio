"use client";

import { useState } from "react";
import type { AboutProfile } from "@/lib/types";

export function ExperienceList({ experience }: { experience: AboutProfile["experience"] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-2">
        {experience.map((item, index) => (
          <button
            key={item.company}
            type="button"
            className={`block w-full border-b border-[var(--color-line)] py-4 text-left transition ${active === index ? "text-[var(--color-ink)]" : "text-[var(--color-muted)]"}`}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onClick={() => setActive(index)}
          >
            <span className="display-type block text-5xl md:text-7xl">{item.company}</span>
          </button>
        ))}
      </div>
      <div className="surface min-h-80 p-6">
        <p className="eyebrow text-[var(--color-muted)]">{experience[active]?.period}</p>
        <h3 className="mt-10 text-4xl uppercase leading-none">{experience[active]?.role}</h3>
        <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--color-muted)]">{experience[active]?.summary}</p>
      </div>
    </div>
  );
}
