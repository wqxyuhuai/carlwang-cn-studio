import type { Work } from "@/lib/types";

export function workPublishedLabel(work: Pick<Work, "publishedAt" | "year">) {
  const now = new Date();
  const publishedDate = work.publishedAt ? new Date(work.publishedAt) : new Date(work.year, 0, 1);
  const publishedYear = Number.isNaN(publishedDate.getTime()) ? work.year : publishedDate.getFullYear();
  const age = Math.max(0, now.getFullYear() - publishedYear);

  if (age === 0) return "This year";
  if (age === 1) return "1 year ago";
  return `${age} years ago`;
}

export function metricLabel(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, value));
}
