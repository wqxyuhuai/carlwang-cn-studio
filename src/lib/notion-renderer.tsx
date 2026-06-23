import Image from "next/image";
import type { NotionBlock, RichTextSpan } from "./types";

function RichText({ spans }: { spans: RichTextSpan[] }) {
  return (
    <>
      {spans.map((span, index) => {
        const style = {
          color: span.color,
          backgroundColor: span.background,
        };
        const className = [
          span.bold ? "font-semibold" : "",
          span.italic ? "italic" : "",
          span.code ? "font-mono text-[0.9em] surface px-1 py-0.5" : "",
          span.underline ? "underline underline-offset-4" : "",
          span.strike ? "line-through" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const content = (
          <span className={className} style={style}>
            {span.text}
          </span>
        );

        if (span.href) {
          return (
            <a
              key={`${span.text}-${index}`}
              href={span.href}
              target="_blank"
              rel="noreferrer"
              className="border-b border-[var(--color-accent)]"
            >
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
    <div className="space-y-8">
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
        <p className="max-w-3xl text-lg leading-8 text-[var(--color-muted)]">
          <RichText spans={block.text} />
        </p>
      );
    case "heading_1":
      return (
        <h2 className="section-title max-w-5xl">
          <RichText spans={block.text} />
        </h2>
      );
    case "heading_2":
      return (
        <h3 className="max-w-3xl text-4xl uppercase leading-none md:text-6xl">
          <RichText spans={block.text} />
        </h3>
      );
    case "heading_3":
      return (
        <h4 className="max-w-2xl text-2xl uppercase md:text-3xl">
          <RichText spans={block.text} />
        </h4>
      );
    case "bulleted_list":
      return (
        <ul className="grid gap-3 border-l border-[var(--color-line)] pl-5 text-[var(--color-muted)]">
          {block.items.map((item, index) => (
            <li key={index}>
              <RichText spans={item} />
            </li>
          ))}
        </ul>
      );
    case "numbered_list":
      return (
        <ol className="grid list-decimal gap-3 pl-5 text-[var(--color-muted)]">
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
        <blockquote className="max-w-4xl border-l-4 border-[var(--color-accent)] py-2 pl-5 text-2xl leading-snug">
          <RichText spans={block.text} />
        </blockquote>
      );
    case "divider":
      return <hr className="hairline border-t" />;
    case "image":
      return (
        <figure className="space-y-3">
          <div className="relative aspect-[16/10] overflow-hidden border border-[var(--color-line)]">
            <Image src={block.media.src} alt={block.media.alt} fill className="object-cover" sizes="100vw" />
          </div>
          {block.media.caption ? (
            <figcaption className="font-mono text-xs uppercase text-[var(--color-muted)]">
              {block.media.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    case "video":
      return (
        <video
          className="w-full border border-[var(--color-line)]"
          src={block.media.src}
          poster={block.media.poster}
          controls
        />
      );
    case "bookmark":
      return (
        <a className="surface block p-5 transition hover:border-[var(--color-accent)]" href={block.url} target="_blank" rel="noreferrer">
          <span className="eyebrow text-[var(--color-muted)]">External link</span>
          <strong className="mt-3 block text-2xl">{block.title}</strong>
          {block.description ? <span className="mt-2 block text-[var(--color-muted)]">{block.description}</span> : null}
        </a>
      );
    case "column_list":
      return (
        <div className="grid gap-5 md:grid-cols-2">
          {block.columns.map((column, index) => (
            <div key={index} className="space-y-5">
              <NotionRenderer blocks={column} />
            </div>
          ))}
        </div>
      );
    case "toggle":
      return (
        <details className="surface p-5">
          <summary className="cursor-pointer text-xl">
            <RichText spans={block.title} />
          </summary>
          <div className="mt-5">
            <NotionRenderer blocks={block.children} />
          </div>
        </details>
      );
    case "unsupported":
      return (
        <div className="surface p-4 font-mono text-sm text-[var(--color-muted)]">
          Unsupported Notion block: {block.label}
        </div>
      );
  }
}
