"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

type ViewMode = "grid" | "list";

const figmaImage = "/figma/pw2-work-image.png";
const gridIcon = "/figma/works-grid-icon.png";
const listIcon = "/figma/works-list-icon.png";
const eyeIcon = "/figma/pw2-icon-eye.svg";
const likeIcon = "/figma/pw2-icon-like.svg";

const categories = [
  { label: "All", count: 25, active: true },
  { label: "Website & Interface", count: 11 },
  { label: "Brand & Visual System", count: 1 },
  { label: "Motion & Video", count: 0 },
  { label: "Exhibition & Spatial", count: 8 },
  { label: "Creative Experiments", count: 6 }
];

const listItems = Array.from({ length: 12 }, (_, index) => ({
  id: `static-work-${index + 1}`,
  title: "Introducing Lynx Home F Series"
}));

export function WorksBrowser() {
  const [mode, setMode] = useState<ViewMode>("grid");

  return (
    <section className="pw-works-page" aria-label="Works">
      <div className="pw-works-layout">
        <aside className="pw-works-left">
          <div className="pw-category-list" aria-label="Work categories">
            {categories.map((category) => (
              <div className={`pw-category-row${category.active ? " is-active" : ""}`} key={category.label}>
                <span>{category.label}</span>
                <span>/ {category.count}</span>
              </div>
            ))}
          </div>

          <h1 className="pw-works-title">
            Works from
            <br />
            &copy; 2020-2025
          </h1>
        </aside>

        <div className="pw-works-right">
          <div className="pw-view-toggle" aria-label="Works view">
            <button className={mode === "grid" ? "is-active" : undefined} onClick={() => setMode("grid")} type="button">
              <Image alt="" height={20} src={gridIcon} width={20} />
              Grid
            </button>
            <button className={mode === "list" ? "is-active" : undefined} onClick={() => setMode("list")} type="button">
              <Image alt="" height={20} src={listIcon} width={20} />
              List
            </button>
          </div>

          {mode === "grid" ? (
            <div className="pw-works-grid">
              {Array.from({ length: 11 }, (_, index) => (
                <Link className="pw-works-grid-card" href="/works/studio-web-system" key={index}>
                  <Image alt="PW2 selected work cover" height={400} priority={index < 3} src={figmaImage} width={400} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="pw-works-list">
              {listItems.map((item) => (
                <Link className="pw-list-row" href="/works/studio-web-system" key={item.id}>
                  <span className="pw-list-image">
                    <Image alt="PW2 selected work thumbnail" height={400} src={figmaImage} width={400} />
                  </span>
                  <span>
                    <strong className="pw-list-title">{item.title}</strong>
                    <span className="pw-list-meta caption-copy">
                      <span>2 years ago</span>
                      <span className="pw-list-stat">
                        <Image alt="" height={12} src={eyeIcon} width={12} />
                        255
                      </span>
                      <span className="pw-list-stat">
                        <Image alt="" height={12} src={likeIcon} width={12} />
                        255
                      </span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
