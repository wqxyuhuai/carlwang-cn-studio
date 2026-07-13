import type { Work } from "@/lib/types";

export function workPublishedLabel(work: Pick<Work, "publishedAt" | "year">, now = new Date()) {
  const publishedDate = work.publishedAt ? new Date(work.publishedAt) : new Date(work.year, 0, 1);
  const validPublishedDate = Number.isNaN(publishedDate.getTime()) ? new Date(Date.UTC(work.year, 0, 1)) : publishedDate;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const publishedDay = Date.UTC(validPublishedDate.getUTCFullYear(), validPublishedDate.getUTCMonth(), validPublishedDate.getUTCDate());
  const daysAgo = Math.max(0, Math.floor((today - publishedDay) / 86_400_000));

  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 30) return `${daysAgo} days ago`;

  if (daysAgo < 365) {
    const monthsAgo = Math.max(1, Math.floor(daysAgo / 30));
    return monthsAgo === 1 ? "1 month ago" : `${monthsAgo} months ago`;
  }

  const yearsAgo = Math.max(1, Math.floor(daysAgo / 365));
  return yearsAgo === 1 ? "1 year ago" : `${yearsAgo} years ago`;
}

export function metricLabel(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, value));
}
