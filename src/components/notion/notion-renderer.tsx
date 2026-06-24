import Image from "next/image";
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

export function NotionRenderer({ blocks }: { blocks: NotionBlock[] }) {
  return (
    <div className="notion-body">
      {blocks.map((block, index) => (
        <NotionBlockView block={block} key={`${block.type}-${index}`} />
      ))}
    </div>
  );
}

function NotionBlockView({ block }: { block: NotionBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="notion-rich-text text-muted">
          <RichText spans={block.text} />
        </p>
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
        <figure>
          <div className="detail-gallery-item">
            <Image alt={block.media.alt} height={900} src={block.media.src} width={1440} />
          </div>
          {block.media.caption ? <figcaption className="caption-copy text-muted">{block.media.caption}</figcaption> : null}
        </figure>
      );
    case "video":
      return <video controls poster={block.media.poster} src={block.media.src} />;
    case "bookmark":
      return (
        <a className="link-line notion-rich-text" href={block.url} rel="noreferrer" target="_blank">
          {block.title}
        </a>
      );
    case "column_list":
      return (
        <div className="notion-columns">
          {block.columns.map((column, index) => (
            <NotionRenderer blocks={column} key={index} />
          ))}
        </div>
      );
    case "toggle":
      return (
        <details className="notion-rich-text">
          <summary>
            <RichText spans={block.title} />
          </summary>
          <NotionRenderer blocks={block.children} />
        </details>
      );
    case "unsupported":
      return <p className="caption-copy text-muted">Unsupported Notion block: {block.label}</p>;
  }
}
