"use client";

import Image from "next/image";
import { useState } from "react";
import { CascadeText } from "@/components/cascade-text";

type DirectionMedia = {
  alt: string;
  src: string;
};

type DirectionItem = {
  label: string;
  media: DirectionMedia;
};

const directionItems: DirectionItem[] = [
  {
    label: "Digital Experience",
    media: {
      alt: "Digital experience reference composition",
      src: "/field-media/a1-2.webp"
    }
  },
  {
    label: "Visual System",
    media: {
      alt: "Visual system reference composition",
      src: "/field-media/a2-1.webp"
    }
  },
  {
    label: "Motion & Content",
    media: {
      alt: "Motion and content direction visual",
      src: "/figma/about-direction.png"
    }
  },
  {
    label: "Spatial Thinking",
    media: {
      alt: "Spatial thinking reference composition",
      src: "/field-media/b1-1.webp"
    }
  }
];

const defaultDirectionIndex = 2;

export function DirectionShowcase() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const visibleIndex = activeIndex ?? defaultDirectionIndex;

  return (
    <section className="pw-about-direction" onMouseLeave={() => setActiveIndex(null)}>
      <span className="pw-figma-image pw-direction-media" aria-live="polite">
        {directionItems.map((item, index) => (
          <span className="pw-direction-media-item" data-active={visibleIndex === index} key={item.label}>
            <Image alt={item.media.alt} height={420} src={item.media.src} width={420} />
          </span>
        ))}
      </span>
      <div>
        <h2 className="pw-kicker-line">Design Direction</h2>
        <div className="pw-direction-list">
          {directionItems.map((item, index) => (
            <button
              className="pw-direction-button"
              data-active={visibleIndex === index}
              key={item.label}
              onBlur={() => setActiveIndex(null)}
              onClick={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
              type="button"
            >
              <CascadeText text={item.label} underline={false} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
