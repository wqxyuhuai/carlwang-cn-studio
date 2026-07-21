import type { CSSProperties } from "react";
import { ExternalVideoCard } from "@/components/notion/external-video-card";
import { NotionImageLightbox } from "@/components/notion/notion-image-lightbox";
import { ProjectVideoCard } from "@/components/video/ProjectVideoCard";
import type { NotionBlock, NotionListItem, RichTextSpan } from "@/lib/types";

function spanColorClass(color: RichTextSpan["color"]) {
  if (!color) return "";
  if (color === "black60") return "text-black-60";
  if (color === "black40") return "text-muted";
  if (color === "black20") return "text-soft";
  if (color === "green") return "text-green";
  if (!color || color === "default" || color === "black") return "";
  return `notion-color-${color.replaceAll("_", "-")}`;
}

function containsCjkText(spans: RichTextSpan[]) {
  return spans.some((span) => /[\u3400-\u9fff]/u.test(span.text));
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
              span.code ? "notion-inline-code" : "",
              span.equation ? "notion-inline-equation" : "",
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
            <a className="notion-link" href={span.href} key={`${span.text}-${index}`} rel="noreferrer" target="_blank">
              {content}
            </a>
          );
        }

        return <span key={`${span.text}-${index}`}>{content}</span>;
      })}
    </>
  );
}

function plainText(spans: RichTextSpan[]) {
  return spans.map((span) => span.text).join("");
}

function hostnameFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function headingId(block: Extract<NotionBlock, { type: "heading_1" | "heading_2" | "heading_3" | "heading_4" }>) {
  return `notion-${block.id || plainText(block.text).toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/gu, "-")}`;
}

export type NotionHeadingEntry = { id: string; level: number; text: string };

export function collectNotionHeadings(blocks: NotionBlock[], entries: NotionHeadingEntry[] = []) {
  for (const block of blocks) {
    if (["heading_1", "heading_2", "heading_3", "heading_4"].includes(block.type)) {
      const heading = block as Extract<NotionBlock, { type: "heading_1" | "heading_2" | "heading_3" | "heading_4" }>;
      entries.push({ id: headingId(heading), level: Number(heading.type.slice(-1)), text: plainText(heading.text) });
    }
    if (block.type === "column_list") block.columns.forEach((column) => collectNotionHeadings(column, entries));
    if (block.type === "toggle" || block.type === "callout") collectNotionHeadings(block.children, entries);
    if (block.type === "bulleted_list" || block.type === "numbered_list" || block.type === "to_do_list") {
      block.items.forEach((item) => collectNotionHeadings(item.children || [], entries));
    }
  }
  return entries;
}

function NotionList({
  fallbackVideoPoster,
  items,
  type
}: {
  fallbackVideoPoster?: string;
  items: NotionListItem[];
  type: "bulleted_list" | "numbered_list" | "to_do_list";
}) {
  const List = type === "numbered_list" ? "ol" : "ul";
  return (
    <List className={["notion-list", `notion-list--${type}`, "notion-rich-text", "text-muted"].join(" ")}>
      {items.map((item, index) => (
        <li className={item.checked ? "is-checked" : ""} key={index}>
          {type === "to_do_list" ? (
            <span aria-checked={Boolean(item.checked)} className="notion-checkbox" role="checkbox" />
          ) : null}
          <span className="notion-list-copy">
            <RichText spans={item.text} />
          </span>
          {item.children?.length ? <NotionRenderer blocks={item.children} fallbackVideoPoster={fallbackVideoPoster} /> : null}
        </li>
      ))}
    </List>
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
  const tableOfContents = collectNotionHeadings(blocks);

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
          tableOfContents={tableOfContents}
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
  priorityImage,
  tableOfContents
}: {
  block: NotionBlock;
  columnDenominator: number;
  fallbackVideoPoster?: string;
  index: number;
  priorityImage: boolean;
  tableOfContents: NotionHeadingEntry[];
}) {
  switch (block.type) {
    case "paragraph":
      const language = containsCjkText(block.text) ? "zh-CN" : undefined;
      return (
        <p className="notion-rich-text text-muted" lang={language}>
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
        <h2 className="notion-heading notion-heading--1 notion-rich-text" id={headingId(block)}>
          <RichText spans={block.text} />
        </h2>
      );
    case "heading_2":
      return (
        <h3 className="notion-heading notion-heading--2 notion-rich-text" id={headingId(block)}>
          <RichText spans={block.text} />
        </h3>
      );
    case "heading_3":
      return (
        <h4 className="notion-heading notion-heading--3 notion-rich-text" id={headingId(block)}>
          <RichText spans={block.text} />
        </h4>
      );
    case "heading_4":
      return (
        <h5 className="notion-heading notion-heading--4 notion-rich-text" id={headingId(block)}>
          <RichText spans={block.text} />
        </h5>
      );
    case "bulleted_list":
      return <NotionList fallbackVideoPoster={fallbackVideoPoster} items={block.items} type="bulleted_list" />;
    case "numbered_list":
      return <NotionList fallbackVideoPoster={fallbackVideoPoster} items={block.items} type="numbered_list" />;
    case "to_do_list":
      return <NotionList fallbackVideoPoster={fallbackVideoPoster} items={block.items} type="to_do_list" />;
    case "quote":
      return (
        <blockquote className="notion-quote notion-rich-text text-muted">
          <RichText spans={block.text} />
        </blockquote>
      );
    case "callout":
      return (
        <aside className="notion-callout" data-color={block.color || "default"}>
          {block.icon ? <span className="notion-callout-icon">{block.icon}</span> : null}
          <div className="notion-callout-content">
            <p className="notion-rich-text"><RichText spans={block.text} /></p>
            {block.children.length ? <NotionRenderer blocks={block.children} fallbackVideoPoster={fallbackVideoPoster} /> : null}
          </div>
        </aside>
      );
    case "divider":
      return <hr className="notion-divider" />;
    case "table_of_contents":
      return (
        <nav aria-label="Table of contents" className="notion-table-of-contents">
          {tableOfContents.map((heading) => (
            <a className={`is-level-${heading.level}`} href={`#${heading.id}`} key={heading.id}>{heading.text}</a>
          ))}
        </nav>
      );
    case "code":
      return (
        <figure className="notion-code">
          {block.language && block.language !== "plain text" ? <figcaption>{block.language}</figcaption> : null}
          <pre><code>{block.code}</code></pre>
          {block.caption?.length ? <div className="notion-caption text-muted"><RichText spans={block.caption} /></div> : null}
        </figure>
      );
    case "equation":
      return <div aria-label={`Equation: ${block.expression}`} className="notion-equation">{block.expression}</div>;
    case "table":
      return (
        <div className="notion-table-wrap">
          <table className="notion-table">
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => {
                    const isHeader = (block.hasColumnHeader && rowIndex === 0) || (block.hasRowHeader && cellIndex === 0);
                    const Cell = isHeader ? "th" : "td";
                    return <Cell key={cellIndex}><RichText spans={cell} /></Cell>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
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
    case "external_video":
      return (
        <figure className="notion-media">
          <ExternalVideoCard
            embedUrl={block.embedUrl}
            posterUrl={block.posterUrl}
            provider={block.provider}
            title={block.title}
          />
          {block.caption ? <figcaption className="notion-caption text-muted">{block.caption}</figcaption> : null}
        </figure>
      );
    case "bookmark":
      return (
        <a className="notion-bookmark" href={block.url} rel="noreferrer" target="_blank">
          <span className="notion-bookmark-copy">
            <strong>{block.title}</strong>
            {block.description ? <small>{block.description}</small> : null}
            <span className="notion-bookmark-site">{block.siteName || hostnameFromUrl(block.url)}</span>
          </span>
          {block.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- published Open Graph preview can be hosted on the linked site's CDN
            <img alt="" aria-hidden="true" className="notion-bookmark-preview" src={block.imageUrl} />
          ) : null}
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
        <details className="notion-rich-text notion-toggle">
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
