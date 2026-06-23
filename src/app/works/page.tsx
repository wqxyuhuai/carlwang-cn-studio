import type { Metadata } from "next";
import { WorksBrowser } from "@/components/works-browser";
import { getPublishedWorks } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Works",
  description: "Selected works by Carl Wang Studio across website, brand, interface, motion, campaign, and 3D render projects.",
};

export default async function WorksPage() {
  const works = await getPublishedWorks();

  return (
    <main>
      <section className="page-shell grid min-h-[58dvh] items-end pb-12 pt-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.7fr] lg:items-end">
          <div>
            <p className="eyebrow text-[var(--color-muted)]">Selected cases / Grid and list browsing</p>
            <h1 className="display-type mt-8 text-[var(--text-page-title)]">Works</h1>
          </div>
          <p className="max-w-xl text-lg leading-8 text-[var(--color-muted)]">
            Browse published projects by year and category. Grid mode is visual-first; list mode is for scanning project context quickly.
          </p>
        </div>
      </section>
      <WorksBrowser works={works} />
    </main>
  );
}
