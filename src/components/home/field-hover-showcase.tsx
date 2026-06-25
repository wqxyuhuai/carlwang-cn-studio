"use client";

import Image from "next/image";
import { useState } from "react";
import { CascadeText } from "@/components/cascade-text";

type FieldMedia =
  | {
      alt: string;
      kind: "image";
      src: string;
    }
  | {
      alt: string;
      kind: "video";
      poster: string;
      src: string;
    };

type FieldItem = {
  label: string;
  href?: string;
  media: FieldMedia;
};

const fallbackFieldItems: FieldItem[] = [
  {
    label: "Website & Interface",
    media: {
      alt: "Website and interface reference composition",
      kind: "image",
      src: "/field-media/a1-2.webp"
    }
  },
  {
    label: "Brand & Visual System",
    media: {
      alt: "Brand and visual system reference composition",
      kind: "image",
      src: "/field-media/a2-1.webp"
    }
  },
  {
    label: "Motion & Video",
    media: {
      alt: "Motion and video reference preview",
      kind: "video",
      poster: "/field-media/a1-1.webp",
      src: "/field-media/a1-1.mp4"
    }
  },
  {
    label: "Exhibition & Spatial",
    media: {
      alt: "Spatial and product environment reference composition",
      kind: "image",
      src: "/field-media/b1-1.webp"
    }
  },
  {
    label: "Creative Experiments",
    media: {
      alt: "Creative experiment reference composition",
      kind: "image",
      src: "/field-media/c1-5.webp"
    }
  }
];

const defaultMediaIndex = 2;

export function FieldHoverShowcase({ items = fallbackFieldItems }: { items?: FieldItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const fieldItems = items.length > 0 ? items : fallbackFieldItems;
  const visibleIndex = Math.min(activeIndex ?? defaultMediaIndex, fieldItems.length - 1);

  return (
    <section className="pw-fields-band" aria-label="Design fields" onMouseLeave={() => setActiveIndex(null)}>
      <span className="pw-figma-image pw-field-media" aria-live="polite">
        {fieldItems.map((item, index) => {
          const isVisible = visibleIndex === index;

          return (
            <span className="pw-field-media-item" data-active={isVisible} key={item.label}>
              {item.media.kind === "image" ? (
                <Image alt={item.media.alt} height={400} src={item.media.src} width={400} />
              ) : (
                <video aria-label={item.media.alt} autoPlay loop muted playsInline poster={item.media.poster} preload="metadata" src={item.media.src} />
              )}
            </span>
          );
        })}
      </span>
      <div className="pw-field-list">
        {fieldItems.map((item, index) => (
          <button
            className="pw-field-button"
            data-active={activeIndex === index}
            key={item.label}
            onBlur={() => setActiveIndex(null)}
            onClick={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onMouseEnter={() => setActiveIndex(index)}
            type="button"
          >
            <CascadeText text={item.label} />
          </button>
        ))}
      </div>
    </section>
  );
}
