import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedWorks, getWorkBySlug } from "@/lib/site-data";
import { NotionRenderer } from "@/lib/notion-renderer";

export async function generateStaticParams() {
  const works = await getPublishedWorks();
  return works.map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const work = await getWorkBySlug(slug);
  if (!work) return {};

  return {
    title: work.seoTitle || work.title,
    description: work.seoDescription || work.intro,
  };
}

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const works = await getPublishedWorks();
  const work = works.find((item) => item.slug === slug);
  if (!work) notFound();

  const currentIndex = works.findIndex((item) => item.slug === work.slug);
  const previous = works[(currentIndex - 1 + works.length) % works.length];
  const next = works[(currentIndex + 1) % works.length];

  return (
    <main className="framed-page overflow-hidden px-5 pb-5 pt-20 md:px-8">
      <section className="grid min-h-[calc(100dvh-8rem)] gap-10 lg:grid-cols-[minmax(320px,0.82fr)_1fr]">
        <aside className="flex flex-col justify-between gap-8">
          <div>
            <Link className="underlined-link text-xs uppercase text-[var(--color-muted)]" href="/works">
              Back to works
            </Link>
            <figure className="mt-10 max-w-[520px]">
              <div className="relative aspect-square overflow-hidden border border-[var(--color-line)]">
                <Image src={work.coverImage.src} alt={work.coverImage.alt} fill priority className="object-cover" sizes="44vw" />
              </div>
              <figcaption className="mt-3 font-mono text-[10px] uppercase text-[var(--color-muted)]">{work.coverImage.caption || work.title}</figcaption>
            </figure>
          </div>

          <div className="max-w-xl border-t border-[var(--color-line)] pt-6">
            <p className="eyebrow text-[var(--color-muted)]">
              {work.year} / {work.category}
            </p>
            <h1 className="poster-type mt-4 text-[clamp(3.2rem,6vw,6.5rem)]">{work.title}</h1>
            <p className="mt-5 text-base leading-7 text-[var(--color-muted)]">{work.intro}</p>
            <dl className="mt-8 grid gap-3 text-sm">
              <div className="grid grid-cols-[86px_1fr] gap-4 border-t border-[var(--color-line)] pt-3">
                <dt className="text-[var(--color-muted)]">Role</dt>
                <dd>{work.role}</dd>
              </div>
              <div className="grid grid-cols-[86px_1fr] gap-4 border-t border-[var(--color-line)] pt-3">
                <dt className="text-[var(--color-muted)]">Tools</dt>
                <dd>{work.tools.join(", ")}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <section className="relative min-h-[60dvh] border-l border-[var(--color-line)] pl-0 lg:h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:pl-10">
          <div className="pointer-events-none sticky top-0 z-10 hidden h-8 bg-gradient-to-b from-[var(--color-surface)] to-transparent lg:block" />
          <article className="notion-body mx-auto max-w-3xl pb-12 lg:pr-6">
            <p className="eyebrow mb-8 text-[var(--color-muted)]">Notion body</p>
            <NotionRenderer blocks={work.content} />
            <nav className="mt-16 grid gap-3 border-t border-[var(--color-line)] pt-5 md:grid-cols-2" aria-label="Adjacent works">
              <Link className="group grid grid-cols-[64px_1fr] gap-3 text-left" href={`/works/${previous.slug}`}>
                <span className="relative aspect-square overflow-hidden border border-[var(--color-line)]">
                  <Image src={previous.coverImage.src} alt={previous.coverImage.alt} fill className="object-cover transition group-hover:scale-[1.04]" sizes="64px" />
                </span>
                <span>
                  <span className="eyebrow block text-[var(--color-muted)]">Previous</span>
                  <strong className="mt-2 block uppercase leading-none">{previous.title}</strong>
                </span>
              </Link>
              <Link className="group grid grid-cols-[64px_1fr] gap-3 text-left md:text-right" href={`/works/${next.slug}`}>
                <span className="relative aspect-square overflow-hidden border border-[var(--color-line)] md:order-2">
                  <Image src={next.coverImage.src} alt={next.coverImage.alt} fill className="object-cover transition group-hover:scale-[1.04]" sizes="64px" />
                </span>
                <span>
                  <span className="eyebrow block text-[var(--color-muted)]">Next</span>
                  <strong className="mt-2 block uppercase leading-none">{next.title}</strong>
                </span>
              </Link>
            </nav>
          </article>
          <div className="pointer-events-none sticky bottom-0 hidden h-10 bg-gradient-to-t from-[var(--color-surface)] to-transparent lg:block" />
        </section>
      </section>
    </main>
  );
}
