import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RevealMedia } from "@/components/common/RevealMedia";
import { NotionRenderer } from "@/components/notion/notion-renderer";
import { WorkDetailClose } from "@/components/works/work-detail-close";
import { WorkDetailHeading } from "@/components/works/work-detail-heading";
import { WorkDetailPagerLink } from "@/components/works/work-detail-pager-link";
import { WorkDetailScrollTop } from "@/components/works/work-detail-scroll-top";
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

function DetailImage({ media, className = "", priority = false, revealIndex = 0 }: { media: MediaItem; className?: string; priority?: boolean; revealIndex?: number }) {
  return (
    <RevealMedia className={`pw-detail-image ${className}`} element="figure" index={revealIndex}>
      <Image alt={media.alt} height={868} priority={priority} src={media.src} width={868} />
    </RevealMedia>
  );
}

function PagerItem({ direction, revealIndex, work }: { direction: "previous" | "next"; revealIndex: number; work: Work }) {
  const isNext = direction === "next";

  return (
    <WorkDetailPagerLink className={`pw-detail-pager-item ${isNext ? "is-next" : ""}`} href={`/works/${work.slug}`}>
      <span className="pw-detail-pager-label">
        {!isNext ? <span className="pw-detail-arrow is-left" aria-hidden="true" /> : null}
        <span>{isNext ? "Next" : "Previous"}</span>
        {isNext ? <span className="pw-detail-arrow is-right" aria-hidden="true" /> : null}
      </span>
      <span className="pw-detail-pager-card">
        <RevealMedia className="pw-detail-pager-thumb" element="span" index={revealIndex}>
          <Image alt={work.cover.alt || work.title} height={100} src={work.cover.src} width={100} />
        </RevealMedia>
      </span>
    </WorkDetailPagerLink>
  );
}

const fallbackToolIcons: Record<string, string> = {
  "after-effects": "/figma/pw2-tool-ae.svg",
  blender: "/figma/pw2-tool-blender.svg",
  figma: "/figma/pw2-icon-figma.svg",
  illustrator: "/figma/pw2-tool-ai.svg",
  photoshop: "/figma/pw2-tool-ps.svg"
};

const darkThemeInvertedToolIcons = new Set(["rhino"]);

function toolKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function toolIconFor(name: string, tools: Tool[]) {
  const normalized = toolKey(name);
  return tools.find((tool) => toolKey(tool.name) === normalized && tool.iconUrl)?.iconUrl || fallbackToolIcons[normalized] || "";
}

export default async function WorkDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getWorkBySlug(slug);
  if (!result) notFound();

  const { work, previous, next, content } = result;
  const gallery = (work.gallery.length > 0 ? work.gallery : [work.cover]).filter((item) => item.type === "image");
  const fallbackGallery = Array.from(new Map([work.cover, ...gallery].filter((item) => item.type === "image").map((item) => [item.src, item])).values());
  const hasBodyContent = work.content.length > 0;
  const visibleTools = work.tools
    .map((tool) => ({ icon: toolIconFor(tool, content.tools), inverted: darkThemeInvertedToolIcons.has(toolKey(tool)), name: tool }))
    .filter((tool) => tool.icon);

  return (
    <main className="pw-detail-page">
      <WorkDetailClose />
      <WorkDetailScrollTop />
      <aside className="pw-detail-left" aria-label="Work summary">
        <div className="pw-detail-summary">
          <DetailImage className="is-cover" media={work.cover} priority revealIndex={0} />

          <WorkDetailHeading
            publishedLabel={workPublishedLabel(work)}
            slug={work.slug}
            title={work.title}
            viewCount={work.viewCount}
          />

          {visibleTools.length > 0 ? (
            <div className="pw-detail-tools" aria-label="Tools">
              <div className="pw-detail-tools-title">Tools</div>
              <ul className="pw-detail-tool-list">
                {visibleTools.map((tool) => (
                  <li className={`pw-detail-tool${tool.inverted ? " is-dark-inverted" : ""}`} key={tool.name} title={tool.name}>
                    <Image alt={tool.name} height={24} src={tool.icon} width={24} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <nav className="pw-detail-pager" aria-label="Adjacent works">
          {previous ? <PagerItem direction="previous" revealIndex={1} work={previous} /> : null}
          {next ? <PagerItem direction="next" revealIndex={2} work={next} /> : null}
        </nav>
      </aside>

      <section className="pw-detail-right" aria-label="Work body">
        <div className="pw-detail-body">
          {hasBodyContent ? (
            <NotionRenderer blocks={work.content} fallbackVideoPoster={work.cover.src} />
          ) : (
            <div className="pw-detail-fallback-flow" aria-label="Fallback work body">
              {fallbackGallery.map((item, index) => (
                <DetailImage className="is-flow" key={item.src} media={item} priority={index === 0} revealIndex={index} />
              ))}
              <div className="pw-detail-copy">
                {work.intro ? <p>{work.intro}</p> : null}
                {work.overview ? <p>{work.overview}</p> : null}
                {work.role ? <p>Role: {work.role}</p> : null}
                {work.tags && work.tags.length > 0 ? <p>Tags: {work.tags.slice(0, 3).join(", ")}</p> : null}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
