import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Work } from "@/lib/types";

type D1Value = string | number | boolean | null;

type D1PreparedStatementLike = {
  bind: (...values: D1Value[]) => D1PreparedStatementLike;
  run: () => Promise<unknown>;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>;
};

type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatementLike;
};

type MetricsEnv = {
  WORK_METRICS_DB?: D1DatabaseLike;
};

function normalizedSlug(value: string) {
  return value.trim();
}

function numberValue(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

async function getMetricsDb() {
  try {
    const context = await getCloudflareContext({ async: true });
    return (context.env as MetricsEnv).WORK_METRICS_DB || null;
  } catch {
    return null;
  }
}

export async function getWorkViewCounts(slugs: string[]) {
  const uniqueSlugs = Array.from(new Set(slugs.map(normalizedSlug).filter(Boolean)));
  if (uniqueSlugs.length === 0) return new Map<string, number>();

  const db = await getMetricsDb();
  if (!db) return new Map<string, number>();

  try {
    const placeholders = uniqueSlugs.map(() => "?").join(", ");
    const result = await db
      .prepare(`SELECT slug, views FROM work_view_counts WHERE slug IN (${placeholders})`)
      .bind(...uniqueSlugs)
      .all<{ slug: string; views: number }>();

    return new Map((result.results || []).map((row) => [row.slug, numberValue(row.views)]));
  } catch {
    return new Map<string, number>();
  }
}

export async function applyWorkViewCounts<T extends Work>(works: T[]) {
  const viewCounts = await getWorkViewCounts(works.map((work) => work.slug));
  if (viewCounts.size === 0) return works;

  return works.map((work) => {
    const storedCount = viewCounts.get(work.slug);
    if (storedCount === undefined) return work;
    return {
      ...work,
      viewCount: Math.max(work.viewCount, storedCount)
    };
  });
}

export async function incrementWorkViewCount(slug: string, baseViewCount: number) {
  const safeSlug = normalizedSlug(slug);
  if (!safeSlug) return null;

  const db = await getMetricsDb();
  if (!db) return null;

  const base = numberValue(baseViewCount);

  try {
    await db
      .prepare(`
        INSERT INTO work_view_counts (slug, views, created_at, updated_at)
        VALUES (?, ? + 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET
          views = max(work_view_counts.views, ?) + 1,
          updated_at = CURRENT_TIMESTAMP
      `)
      .bind(safeSlug, base, base)
      .run();

    const row = await db
      .prepare("SELECT views FROM work_view_counts WHERE slug = ?")
      .bind(safeSlug)
      .first<{ views: number }>();

    return row ? numberValue(row.views) : base + 1;
  } catch {
    return null;
  }
}
