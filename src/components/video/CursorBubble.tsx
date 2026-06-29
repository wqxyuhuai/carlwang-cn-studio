"use client";

import type { CSSProperties } from "react";

export function CursorBubble({
  className = "",
  label,
  style
}: {
  className?: string;
  label: string;
  style?: CSSProperties;
}) {
  return (
    <span aria-hidden="true" className={["video-cursor-bubble", className].filter(Boolean).join(" ")} style={style}>
      {label}
    </span>
  );
}
