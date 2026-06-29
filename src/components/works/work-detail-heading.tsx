"use client";

import { useEffect, useState } from "react";
import { metricLabel } from "@/lib/work-metrics";

export function WorkDetailHeading({
  publishedLabel,
  slug,
  title,
  viewCount
}: {
  publishedLabel: string;
  slug: string;
  title: string;
  viewCount: number;
}) {
  const [displayViewCount, setDisplayViewCount] = useState(viewCount);

  useEffect(() => {
    let cancelled = false;

    async function recordView() {
      try {
        const response = await fetch(`/api/works/${encodeURIComponent(slug)}/view`, {
          method: "POST",
          cache: "no-store"
        });
        if (!response.ok) return;
        const result = await response.json() as { viewCount?: number };
        if (!cancelled && typeof result.viewCount === "number") {
          setDisplayViewCount(result.viewCount);
        }
      } catch {
        // View count tracking is best-effort and should never block the detail page.
      }
    }

    void recordView();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="pw-detail-heading">
      <div className="pw-detail-title-stack">
        <h1>{title}</h1>
        <div className="pw-detail-stats" aria-label="Work metrics">
          <span>{publishedLabel}</span>
          <span aria-hidden="true">&middot;</span>
          <span className="pw-detail-stat">
            <span className="pw-stat-icon pw-stat-icon-eye" aria-hidden="true" />
            {metricLabel(displayViewCount)}
          </span>
        </div>
      </div>
    </div>
  );
}
