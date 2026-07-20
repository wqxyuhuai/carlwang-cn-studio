import type { CSSProperties } from "react";
import { NotionImageLightbox } from "@/components/notion/notion-image-lightbox";
import { ProjectVideoCard } from "@/components/video/ProjectVideoCard";
import type { NotionBlock, RichTextSpan } from "@/lib/types";

function spanColorClass(color: RichTextSpan["color"]) {
  if (!color) return "";
  if (color === "black60") return "text-black-60";
  if (color === "black40") return "text-muted";
  if (color === "black20") return "text-soft";
  if (color === "green") return "text-green";
  return "";
}

function RichText({ spans }: { spans: RichTextSpan[] }) {
  return (
    <>
      {spans.map((span, index) => {
        const content = (
          <span
            className={[
              span.bold ? "font-semibold" : "",
              span.italic ? "italic" : "",
              span.code ? "font-mono" : "",
              span.underline ? "underline underline-offset-4" : "",
              span.strike ? "line-through" : "",
              spanColorClass(span.color)
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {span.text}
          </span>
        );

        if (span.href) {
          return (
            <a className="link-line" href={span.href} key={`${span.text}-${index}`} rel="noreferrer" target="_blank">
              {content}
            </a>
          );
        }

        return <span key={`${span.text}-${index}`}>{content}</span>;
      })}
    </>
  );
}

function imageSizesForColumnDenominator(columnDenominator: number) {
  const denominator = Math.max(1, columnDenominator);
  const format = (value: number) => Number(value.toFixed(4));
  const mobileViewportWidth = format(100 / denominator);
  const mobileReservedRem = format((denominator + 3) / denominator);
  const desktopViewportWidth = format(50 / denominator);

  return `(max-width: 900px) calc(${mobileViewportWidth}vw - ${mobileReservedRem}rem), ${desktopViewportWidth}vw`;
}

export function NotionRenderer({
  blocks,
  className = "",
  columnDenominator = 1,
  fallbackVideoPoster
}: {
  blocks: NotionBlock[];
  className?: string;
  columnDenominator?: number;
  fallbackVideoPoster?: string;
}) {
  const firstImageIndex = blocks.findIndex((block) => block.type === "image");

  return (
    <div className={["notion-body", className].filter(Boolean).join(" ")}>
      {blocks.map((block, index) => (
        <NotionBlockView
          block={block}
          columnDenominator={columnDenominator}
          fallbackVideoPoster={fallbackVideoPoster}
          index={index}
          key={`${block.type}-${index}`}
          priorityImage={index === firstImageIndex}
        />
      ))}
    </div>
  );
}

function NotionBlockView({
  block,
  columnDenominator,
  fallbackVideoPoster,
  index,
  priorityImage
}: {
  block: NotionBlock;
  columnDenominator: number;
  fallbackVideoPoster?: string;
  index: number;
  priorityImage: boolean;
}) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="notion-rich-text text-muted">
          <RichText spans={block.text} />
        </p>
      );
    case "spacer":
      return (
        <div
          aria-hidden="true"
          className="notion-spacer"
          style={{ blockSize: `${Math.min(8, Math.max(1, block.size)) * 1.25}rem` }}
        />
      );
    case "heading_1":
      return (
        <h2 className="display-type notion-rich-text">
          <RichText spans={block.text} />
        </h2>
      );
    case "heading_2":
      return (
        <h3 className="subtitle-type notion-rich-text">
          <RichText spans={block.text} />
        </h3>
      );
    case "heading_3":
      return (
        <h4 className="body-copy notion-rich-text">
          <RichText spans={block.text} />
        </h4>
      );
    case "bulleted_list":
      return (
        <ul className="notion-rich-text text-muted">
          {block.items.map((item, index) => (
            <li key={index}>
              <RichText spans={item} />
            </li>
          ))}
        </ul>
      );
    case "numbered_list":
      return (
        <ol className="notion-rich-text text-muted">
          {block.items.map((item, index) => (
            <li key={index}>
              <RichText spans={item} />
            </li>
          ))}
        </ol>
      );
    case "quote":
    case "callout":
      return (
        <blockquote className="notion-callout">
          <RichText spans={block.text} />
        </blockquote>
      );
    case "divider":
      return <hr className="notion-divider" />;
    case "image":
      return (
        <figure className="notion-media">
          <NotionImageLightbox
            alt={block.media.alt}
            height={block.media.height || 1000}
            index={index}
            priority={priorityImage}
            sizes={imageSizesForColumnDenominator(columnDenominator)}
            src={block.media.src}
            width={block.media.width || 1600}
          />
          {block.media.caption ? <figcaption className="notion-caption text-muted">{block.media.caption}</figcaption> : null}
        </figure>
      );
    case "video":
      return (
        <figure className="notion-media">
          <ProjectVideoCard
            video={{
              duration: block.media.duration,
              mutedDefault: block.media.mutedDefault,
              poster: block.media.poster || fallbackVideoPoster,
              spriteColumns: block.media.spriteColumns,
              spriteFrameCount: block.media.spriteFrameCount,
              spriteRows: block.media.spriteRows,
              spriteSrc: block.media.spriteSrc,
              src: block.media.src,
              title: block.media.alt
            }}
            revealIndex={index}
          />
          {block.media.caption ? <figcaption className="notion-caption text-muted">{block.media.caption}</figcaption> : null}
        </figure>
      );
    case "bookmark":
      return (
        <a className="notion-bookmark" href={block.url} rel="noreferrer" target="_blank">
          <span>{block.title}</span>
          {block.description ? <small>{block.description}</small> : null}
        </a>
      );
    case "column_list":
      const nestedColumnDenominator = Math.max(1, columnDenominator) * Math.max(1, block.columns.length);
      const columnStyle = {
        "--notion-column-count": String(Math.max(1, block.columns.length))
      } as CSSProperties;

      return (
        <div className="notion-columns" style={columnStyle}>
          {block.columns.map((column, index) => (
            <NotionRenderer
              blocks={column}
              columnDenominator={nestedColumnDenominator}
              fallbackVideoPoster={fallbackVideoPoster}
              key={index}
            />
          ))}
        </div>
      );
    case "toggle":
      return (
        <details className="notion-rich-text">
          <summary>
            <RichText spans={block.title} />
          </summary>
          <NotionRenderer
            blocks={block.children}
            columnDenominator={columnDenominator}
            fallbackVideoPoster={fallbackVideoPoster}
          />
        </details>
      );
    case "unsupported":
      return null;
  }
}
