"use client";

import Image from "next/image";
import { useState } from "react";
import { metricLabel } from "@/lib/work-metrics";

const eyeIcon = "/figma/pw2-icon-eye.svg";
const likeIcon = "/figma/pw2-icon-like.svg";

export function WorkDetailHeading({
  likeCount,
  publishedLabel,
  title,
  viewCount,
  workId
}: {
  likeCount: number;
  publishedLabel: string;
  title: string;
  viewCount: number;
  workId: string;
}) {
  const storageKey = `work-like-count:${workId}`;
  const [displayLikeCount, setDisplayLikeCount] = useState(likeCount);

  function likeWork() {
    setDisplayLikeCount((current) => {
      const next = current + 1;
      window.localStorage.setItem(storageKey, String(next));
      return next;
    });
  }

  return (
    <div className="pw-detail-heading">
      <div className="pw-detail-title-stack">
        <h1>{title}</h1>
        <div className="pw-detail-stats" aria-label="Work metrics">
          <span>{publishedLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="pw-detail-stat">
            <Image alt="" height={18} src={eyeIcon} width={18} />
            {metricLabel(viewCount)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="pw-detail-stat">
            <Image alt="" height={18} src={likeIcon} width={18} />
            {metricLabel(displayLikeCount)}
          </span>
        </div>
      </div>
      <button aria-label={`Like ${title}`} className="pw-detail-like" onClick={likeWork} type="button">
        <Image alt="" height={40} src={likeIcon} width={40} />
      </button>
    </div>
  );
}
