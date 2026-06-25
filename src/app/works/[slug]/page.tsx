import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NotionRenderer } from "@/components/notion/notion-renderer";
import { WorkDetailHeading } from "@/components/works/work-detail-heading";
import { getPublishedWorks, getWorkBySlug } from "@/lib/public-content";
import { workPublishedLabel } from "@/lib/work-metrics";
import type { MediaItem, Tool, Work } from "@/lib/types";

export async function generateStaticParams() {
  const works = await getPublishedWorks();
  return works.map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getWorkBySlug(slug);
  if (!result) return {};
  const { work } = result;

  return {
    title: work.title,
    description: work.intro || work.overview || "Selected work by Carl Wang Studio.",
    openGraph: {
      title: work.title,
      description: work.intro || work.overview || "Selected work by Carl Wang Studio.",
      images: work.cover.src ? [{ url: work.cover.src }] : undefined
    }
  };
}

function IconImage({ alt = "", src, size }: { alt?: string; src: string; size: number }) {
  return <Image alt={alt} height={size} src={src} width={size} />;
}

function imageMedia(media: MediaItem | undefined, fallback: MediaItem) {
  if (!media || media.type === "video") return fallback;
  return media;
}

function DetailImage({ media, className = "", priority = false }: { media: MediaItem; className?: string; priority?: boolean }) {
  return (
    <figure className={`pw-detail-image ${className}`}>
      <Image alt={media.alt} height={868} priority={priority} src={media.src} width={868} />
    </figure>
  );
}

function PagerItem({ direction, work }: { direction: "previous" | "next"; work: Work }) {
  const isNext = direction === "next";

  return (
    <Link className={`pw-detail-pager-item ${isNext ? "is-next" : ""}`} href={`/works/${work.slug}`}>
      <span className="pw-detail-pager-label">
        {!isNext ? <IconImage src="/figma/pw2-icon-arrow-left.svg" size={18} /> : null}
        <span>{isNext ? "Next" : "Previous"}</span>
        {isNext ? <IconImage src="/figma/pw2-icon-arrow-right.svg" size={18} /> : null}
      </span>
      <span className="pw-detail-pager-card">
        <span className="pw-detail-pager-thumb">
          <Image alt={work.cover.alt || work.title} height={100} src={work.cover.src} width={100} />
        </span>
          <span className="pw-detail-pager-copy">
            <span className="pw-detail-pager-title">{work.title}</span>
          <span className="pw-detail-pager-age">{workPublishedLabel(work)}</span>
        </span>
      </span>
    </Link>
  );
}

function toolIconFor(name: string, tools: Tool[]) {
  const normalized = name.trim().toLowerCase();
  return tools.find((tool) => tool.name.trim().toLowerCase() === normalized && tool.iconUrl)?.iconUrl || "";
}

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getWorkBySlug(slug);
  if (!result) notFound();

  const { work, previous, next, content } = result;
  const gallery = (work.gallery.length > 0 ? work.gallery : [work.cover]).filter((item) => item.type === "image");
  const firstImage = imageMedia(gallery[0], work.cover);
  const secondImage = imageMedia(gallery[1], firstImage);
  const thirdImage = imageMedia(gallery[2], firstImage);
  const remaining = gallery.slice(3);

  return (
    <main className="pw-detail-page">
      <aside className="pw-detail-left" aria-label="Work summary">
        <div className="pw-detail-summary">
          <Link className="pw-detail-back" href="/works">
            <IconImage src="/figma/pw2-icon-arrow-left.svg" size={18} />
            <span>Back</span>
          </Link>

          <DetailImage className="is-cover" media={work.cover} priority />

          <WorkDetailHeading
            likeCount={work.likeCount}
            publishedLabel={workPublishedLabel(work)}
            title={work.title}
            viewCount={work.viewCount}
            workId={work.id}
          />

          <div className="pw-detail-tools" aria-label="Tools">
            <div className="pw-detail-tools-title">Tools</div>
            <ul className="pw-detail-tool-list">
              {(work.tools.length > 0 ? work.tools : ["Design"]).map((tool) => (
                <li className="pw-detail-tool" key={tool}>
                  {toolIconFor(tool, content.tools) ? <IconImage alt="" src={toolIconFor(tool, content.tools)} size={24} /> : null}
                  <span>{tool}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <nav className="pw-detail-pager" aria-label="Adjacent works">
          {previous ? <PagerItem direction="previous" work={previous} /> : null}
          {next ? <PagerItem direction="next" work={next} /> : null}
        </nav>
      </aside>

      <section className="pw-detail-right" aria-label="Work body">
        <div className="pw-detail-body">
          <DetailImage className="is-wide" media={firstImage} priority />
          <div className="pw-detail-image-pair">
            <DetailImage media={secondImage} />
            <DetailImage media={thirdImage} />
          </div>
          <div className="pw-detail-copy">
            {work.intro ? <p>{work.intro}</p> : null}
            {work.overview ? <p>{work.overview}</p> : null}
            {work.role ? <p>Role: {work.role}</p> : null}
            {work.tags && work.tags.length > 0 ? <p>Tags: {work.tags.slice(0, 3).join(", ")}</p> : null}
          </div>
          {work.content.length > 0 ? <NotionRenderer blocks={work.content} /> : null}
          {remaining.length > 0 ? (
            <div className="pw-detail-image-pair">
              {remaining.slice(0, 2).map((item) => (
                <DetailImage key={item.src} media={item} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
