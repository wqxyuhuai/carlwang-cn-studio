import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FooterNavigation } from "@/components/footer-navigation";
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
    <main>
      <section className="page-shell py-10">
        <Link className="btn" href="/works">
          Back to works
        </Link>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_0.46fr] lg:items-end">
          <div>
            <p className="eyebrow text-[var(--color-muted)]">
              {work.year} / {work.category}
            </p>
            <h1 className="display-type mt-8 text-[var(--text-page-title)]">{work.title}</h1>
          </div>
          <div className="grid gap-5 border-t border-[var(--color-line)] pt-5">
            <p className="text-lg leading-8 text-[var(--color-muted)]">{work.intro}</p>
            <dl className="grid gap-3 text-sm">
              <div className="grid grid-cols-[100px_1fr] gap-4">
                <dt className="text-[var(--color-muted)]">Role</dt>
                <dd>{work.role}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-4">
                <dt className="text-[var(--color-muted)]">Tools</dt>
                <dd>{work.tools.join(", ")}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="page-shell">
        <div className="relative aspect-[16/9] overflow-hidden border border-[var(--color-line)]">
          <Image src={work.coverImage.src} alt={work.coverImage.alt} fill priority className="object-cover" sizes="100vw" />
        </div>
      </section>

      <section className="page-shell grid gap-5 py-20 md:grid-cols-6">
        {work.gallery.map((media, index) => (
          <figure key={`${media.src}-${index}`} className={index === 0 ? "md:col-span-4" : "md:col-span-2"}>
            <div className="relative aspect-[4/3] overflow-hidden border border-[var(--color-line)]">
              <Image src={media.src} alt={media.alt} fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
            </div>
            {media.caption ? <figcaption className="mt-2 font-mono text-xs uppercase text-[var(--color-muted)]">{media.caption}</figcaption> : null}
          </figure>
        ))}
      </section>

      <section className="page-shell pb-24">
        <NotionRenderer blocks={work.content} />
      </section>

      <nav className="page-shell grid gap-4 pb-20 md:grid-cols-2" aria-label="Adjacent works">
        <Link className="surface p-5 transition hover:border-[var(--color-accent)]" href={`/works/${previous.slug}`}>
          <span className="eyebrow text-[var(--color-muted)]">Previous</span>
          <strong className="mt-8 block text-4xl uppercase leading-none">{previous.title}</strong>
        </Link>
        <Link className="surface p-5 text-right transition hover:border-[var(--color-accent)]" href={`/works/${next.slug}`}>
          <span className="eyebrow text-[var(--color-muted)]">Next</span>
          <strong className="mt-8 block text-4xl uppercase leading-none">{next.title}</strong>
        </Link>
      </nav>
      <FooterNavigation />
    </main>
  );
}
