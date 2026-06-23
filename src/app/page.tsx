import Image from "next/image";
import Link from "next/link";
import { FooterNavigation } from "@/components/footer-navigation";
import { getStudioData } from "@/lib/site-data";

export default async function Home() {
  const data = await getStudioData();
  const featuredWorks = data.works.filter((work) => work.featured && work.status === "Published").slice(0, 6);

  return (
    <main>
      <section className="page-shell grid min-h-[100dvh] grid-rows-[1fr_auto] pb-10 pt-24">
        <div className="flex items-center">
          <div className="w-full max-w-[1180px]">
            <div className="mb-10 flex items-center gap-4 reveal">
              <span className="h-4 w-4 bg-[var(--color-accent)]" aria-hidden />
              <p className="eyebrow text-[var(--color-muted)]">Selected collaborations / 2026</p>
            </div>
            <h1 className="poster-type text-[clamp(4.7rem,13vw,13.25rem)]">
              <span className="mask-line block">Carl Wang</span>
              <span className="mask-line block">Studio</span>
              <span className="mask-line block text-[color-mix(in_srgb,var(--color-ink)_84%,var(--color-bg))]">Visual Systems</span>
            </h1>
            <p className="mt-8 max-w-2xl text-xl leading-8 text-[var(--color-muted)] reveal reveal-delay-3">
              {data.settings.homeHeroDescription}
            </p>
          </div>
        </div>
        <div className="grid gap-3 border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-muted)] md:grid-cols-3 reveal reveal-delay-3">
          <span>Based in China</span>
          <span>Web experiences / motion content</span>
          <span className="md:text-right">Available for selected collaborations</span>
        </div>
      </section>

      <section className="page-shell min-h-[88dvh] py-24 scroll-reveal">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-lg">
            <h2 className="section-title">Selected work</h2>
            <p className="sparse-copy mt-8">
              A quieter second screen gives the work room to appear. The index keeps a poster-like rhythm instead of a packed card wall.
            </p>
            <Link className="underlined-link mt-10 inline-block text-sm uppercase" href="/works">
              View all works
            </Link>
          </div>
          <div className="relative min-h-[620px]">
            {featuredWorks.slice(0, 4).map((work, index) => (
              <Link
                href={`/works/${work.slug}`}
                key={work.slug}
                className="group absolute block overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface)] transition duration-500 ease-[var(--ease-out)] hover:-translate-y-2 hover:border-[var(--color-accent)]"
                style={{
                  width: index === 0 ? "42%" : index === 1 ? "36%" : index === 2 ? "31%" : "27%",
                  right: index === 0 ? "42%" : index === 1 ? "10%" : index === 2 ? "0%" : "55%",
                  top: index === 0 ? "3%" : index === 1 ? "28%" : index === 2 ? "55%" : "66%",
                  zIndex: 4 - index,
                }}
              >
                <span className="relative block aspect-square overflow-hidden">
                  <Image src={work.coverImage.src} alt={work.coverImage.alt} fill priority={index < 2} className="image-lift object-cover" sizes="40vw" />
                </span>
                <span className="flex justify-between gap-3 p-3 font-mono text-[10px] uppercase text-[var(--color-muted)]">
                  <span>{work.title}</span>
                  <span>{work.year}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-24 scroll-reveal">
        <div className="grid gap-16 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <h2 className="poster-type text-[clamp(4rem,10vw,10rem)]">Brand / web / motion</h2>
          </div>
          <div className="grid content-end gap-5">
            {["Brand & Visual", "Web & Interaction", "Product & Experience", "Motion & Content", "Design Workflow & AI Tools"].map((item) => (
              <div className="grid grid-cols-[auto_1fr] gap-5 border-b border-[var(--color-line)] py-4" key={item}>
                <span className="mt-1 h-3 w-3 bg-[var(--color-accent)]" />
                <span className="text-2xl uppercase leading-none">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell pb-28 pt-10 scroll-reveal">
        <div className="grid gap-10 border-t border-[var(--color-line)] pt-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="poster-type text-[clamp(4rem,10vw,10rem)]">About</h2>
          </div>
          <div className="max-w-2xl">
            <p className="text-2xl leading-9">{data.about.bio}</p>
            <div className="mt-10 flex flex-wrap gap-5 text-sm uppercase">
              <Link className="underlined-link" href="/about">
                Read about Carl
              </Link>
              <Link className="underlined-link" href="/about#contact">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FooterNavigation />
    </main>
  );
}
