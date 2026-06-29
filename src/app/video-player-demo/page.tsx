import type { Metadata } from "next";
import { ProjectVideoCard } from "@/components/video/ProjectVideoCard";
import { getPublishedWorks } from "@/lib/public-content";
import type { MediaItem, NotionBlock, Work } from "@/lib/types";

export const metadata: Metadata = {
  title: "Video Player Demo",
  description: "Custom project video player demo for Carl Wang Studio."
};

function findVideoBlock(blocks: NotionBlock[]): MediaItem | null {
  for (const block of blocks) {
    if (block.type === "video") return block.media;
    if (block.type === "column_list") {
      for (const column of block.columns) {
        const result = findVideoBlock(column);
        if (result) return result;
      }
    }
    if (block.type === "toggle") {
      const result = findVideoBlock(block.children);
      if (result) return result;
    }
  }
  return null;
}

function firstVideoWork(works: Work[]) {
  for (const work of works) {
    const media = findVideoBlock(work.content);
    if (media) return { media, work };
  }
  return null;
}

export default async function VideoPlayerDemoPage() {
  const works = await getPublishedWorks();
  const result = firstVideoWork(works);

  return (
    <main className="video-demo-page">
      <section className="video-demo-shell">
        <div className="video-demo-heading">
          <p className="caption-copy text-muted">Custom player demo</p>
          <h1 className="subtitle-type">Project video browser</h1>
        </div>
        {result ? (
          <ProjectVideoCard
            video={{
              duration: result.media.duration,
              mutedDefault: result.media.mutedDefault,
              poster: result.media.poster || result.work.cover.src,
              spriteColumns: result.media.spriteColumns,
              spriteFrameCount: result.media.spriteFrameCount,
              spriteRows: result.media.spriteRows,
              spriteSrc: result.media.spriteSrc,
              src: result.media.src,
              title: result.work.title
            }}
          />
        ) : (
          <p className="body-copy text-muted">No video media is available in the current Aliyun content JSON.</p>
        )}
      </section>
    </main>
  );
}
