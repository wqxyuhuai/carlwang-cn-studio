import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedWorks, getWorkBySlug } from "@/lib/site-data";

const detailWork = {
  title: "Introducing Lynx Home F Series",
  meta: {
    age: "2 years ago",
    views: "255",
    likes: "255"
  },
  image: {
    src: "/figma/pw2-detail-work.png",
    alt: "Introducing Lynx Home F Series visual"
  },
  tools: [
    { label: "Figma", icon: "/figma/pw2-icon-figma.svg" },
    { label: "Notion", icon: "/figma/pw2-icon-notion.svg" },
    { label: "C4d", icon: "/figma/pw2-icon-c4d.svg" }
  ],
  paragraphs: [
    "and interfaces to brand systems, motion graphics and spatial experiences. I like moving across different mediums, because each project brings a different way to organize information, shape atmosphere and build a visual language.",
    "My work often starts with structure: understanding what needs to be communicated, how people will see it, and what kind of feeling the design should leave behind. From there, I focus on layout, rhythm, details and interaction, trying to make the final result feel clear, refined and purposeful.",
    "I'm interested in design that is not only visually attractive, but also useful and memorable. Whether it is a website, a visual system, a video or a spatial presentation, I hope the work can make ideas easier to understand, while still keeping a sense of atmosphere, emotion and personality."
  ]
};

export async function generateStaticParams() {
  const works = await getPublishedWorks();
  return works.map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const work = await getWorkBySlug(slug);
  if (!work) return {};

  return {
    title: detailWork.title,
    description: work.intro
  };
}

function IconImage({ alt = "", src, size }: { alt?: string; src: string; size: number }) {
  return <Image alt={alt} height={size} src={src} width={size} />;
}

function DetailImage({ className = "" }: { className?: string }) {
  return (
    <figure className={`pw-detail-image ${className}`}>
      <Image alt={detailWork.image.alt} height={868} priority src={detailWork.image.src} width={868} />
    </figure>
  );
}

function PagerItem({ direction }: { direction: "previous" | "next" }) {
  const isNext = direction === "next";

  return (
    <Link className={`pw-detail-pager-item ${isNext ? "is-next" : ""}`} href="/works/studio-web-system">
      <span className="pw-detail-pager-label">
        {!isNext ? <IconImage src="/figma/pw2-icon-arrow-left.svg" size={18} /> : null}
        <span>{isNext ? "Next" : "Previous"}</span>
        {isNext ? <IconImage src="/figma/pw2-icon-arrow-right.svg" size={18} /> : null}
      </span>
      <span className="pw-detail-pager-card">
        <span className="pw-detail-pager-thumb">
          <Image alt={detailWork.image.alt} height={100} src={detailWork.image.src} width={100} />
        </span>
        <span className="pw-detail-pager-copy">
          <span className="pw-detail-pager-title">{detailWork.title}</span>
          <span className="pw-detail-pager-age">{detailWork.meta.age}</span>
        </span>
      </span>
    </Link>
  );
}

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = await getWorkBySlug(slug);
  if (!work) notFound();

  return (
    <main className="pw-detail-page">
      <aside className="pw-detail-left" aria-label="Work summary">
        <div className="pw-detail-summary">
          <Link className="pw-detail-back" href="/works">
            <IconImage src="/figma/pw2-icon-arrow-left.svg" size={18} />
            <span>Back</span>
          </Link>

          <DetailImage className="is-cover" />

          <div className="pw-detail-heading">
            <div className="pw-detail-title-stack">
              <h1>{detailWork.title}</h1>
              <div className="pw-detail-stats" aria-label="Work statistics">
                <span>{detailWork.meta.age}</span>
                <span aria-hidden="true">·</span>
                <span className="pw-detail-stat">
                  <IconImage src="/figma/pw2-icon-eye.svg" size={16} />
                  <span>{detailWork.meta.views}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="pw-detail-stat">
                  <IconImage src="/figma/pw2-icon-thumb.svg" size={16} />
                  <span>{detailWork.meta.likes}</span>
                </span>
              </div>
            </div>
            <span className="pw-detail-like" aria-hidden="true">
              <IconImage src="/figma/pw2-icon-like.svg" size={40} />
            </span>
          </div>

          <div className="pw-detail-tools" aria-label="Tools">
            <div className="pw-detail-tools-title">Tools</div>
            <ul className="pw-detail-tool-list">
              {detailWork.tools.map((tool) => (
                <li className="pw-detail-tool" key={tool.label}>
                  <IconImage alt="" src={tool.icon} size={24} />
                  <span>{tool.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <nav className="pw-detail-pager" aria-label="Adjacent works">
          <PagerItem direction="previous" />
          <PagerItem direction="next" />
        </nav>
      </aside>

      <section className="pw-detail-right" aria-label="Work body">
        <div className="pw-detail-body">
          <DetailImage className="is-wide" />
          <div className="pw-detail-image-pair">
            <DetailImage />
            <DetailImage />
          </div>
          <div className="pw-detail-copy">
            {detailWork.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="pw-detail-image-pair">
            <DetailImage />
            <DetailImage />
          </div>
        </div>
      </section>
    </main>
  );
}
