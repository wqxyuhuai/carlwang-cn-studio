import Image from "next/image";
import Link from "next/link";
import { FooterNavigation } from "@/components/footer-navigation";
import { WorkCard } from "@/components/work-card";
import { getStudioData } from "@/lib/site-data";

export default async function Home() {
  const data = await getStudioData();
  const featuredWorks = data.works.filter((work) => work.featured && work.status === "Published").slice(0, 6);

  return (
    <main>
      <section className="page-shell grid min-h-[calc(100dvh-4rem)] gap-10 pb-14 pt-10 lg:grid-cols-[1fr_0.78fr] lg:items-end">
        <div className="reveal">
          <p className="eyebrow text-[var(--color-muted)]">Based in China / Available for selected collaborations</p>
          <h1 className="display-type mt-8 text-[var(--text-hero)]">{data.settings.homeHeroTitle}</h1>
          <p className="mt-7 max-w-2xl text-xl leading-8 text-[var(--color-muted)]">{data.settings.homeHeroDescription}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/works">
              View works
            </Link>
            <Link className="btn" href="/about#contact">
              Start a project
            </Link>
          </div>
        </div>
        <div className="relative min-h-[540px] reveal reveal-delay-1">
          {featuredWorks.slice(0, 3).map((work, index) => (
            <Link
              href={`/works/${work.slug}`}
              key={work.slug}
              className="absolute block border border-[var(--color-line)] bg-[var(--color-surface)] p-2 shadow-[0_24px_70px_rgb(0_0_0_/_0.12)] transition duration-500 hover:-translate-y-2"
              style={{
                width: index === 0 ? "72%" : index === 1 ? "58%" : "48%",
                right: index === 0 ? "8%" : index === 1 ? "0%" : "42%",
                top: index === 0 ? "0%" : index === 1 ? "36%" : "58%",
                zIndex: 3 - index,
              }}
            >
              <span className="relative block aspect-[4/3] overflow-hidden">
                <Image src={work.coverImage.src} alt={work.coverImage.alt} fill priority={index === 0} className="object-cover" sizes="50vw" />
              </span>
              <span className="mt-2 flex justify-between gap-3 font-mono text-xs uppercase text-[var(--color-muted)]">
                <span>{work.title}</span>
                <span>{work.year}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-shell border-y border-[var(--color-line)] py-16">
        <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <h2 className="section-title">Featured Works</h2>
          <p className="max-w-2xl text-lg leading-8 text-[var(--color-muted)]">
            Selected work is arranged as a visual rhythm rather than a flat card wall. The same data model powers list browsing, details, and admin review.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-6">
          {featuredWorks.map((work, index) => (
            <WorkCard key={work.slug} work={work} priority={index < 2} className={index === 0 ? "md:col-span-3" : index === 1 ? "md:col-span-3 md:mt-20" : "md:col-span-2"} />
          ))}
        </div>
      </section>

      <section className="page-shell grid gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="eyebrow text-[var(--color-muted)]">Work fields</p>
          <h2 className="section-title mt-6">Brand, web, interface, motion</h2>
        </div>
        <div className="grid gap-4">
          {["Brand & Visual", "Web & Interaction", "Product & Experience", "Motion & Content", "Design Workflow & AI Tools"].map((item) => (
            <div className="grid grid-cols-[auto_1fr] gap-5 border-b border-[var(--color-line)] py-4" key={item}>
              <span className="h-4 w-4 bg-[var(--color-accent)]" />
              <span className="text-3xl uppercase leading-none">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="page-shell grid gap-8 pb-24 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface p-5">
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image src="/reference/A2 1.webp" alt="About page visual reference" fill className="object-cover" sizes="50vw" />
          </div>
        </div>
        <div className="flex flex-col justify-end border-t border-[var(--color-line)] pt-8">
          <h2 className="display-type text-[clamp(4rem,10vw,10rem)]">About</h2>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-[var(--color-muted)]">{data.about.bio}</p>
          <Link className="btn mt-8 w-fit" href="/about">
            Read about Carl
          </Link>
        </div>
      </section>

      <section className="page-shell pb-20">
        <div className="border-y border-[var(--color-line)] py-14">
          <h2 className="display-type text-[clamp(4rem,12vw,12rem)]">Contact</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <p className="max-w-2xl text-xl leading-8 text-[var(--color-muted)]">
              Have a brand, web, interface, or motion project that needs a clear system and a strong visual direction?
            </p>
            <Link className="btn btn-primary" href="/about#contact">
              Open contact form
            </Link>
          </div>
        </div>
      </section>

      <FooterNavigation />
    </main>
  );
}
