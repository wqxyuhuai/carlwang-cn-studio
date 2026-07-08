"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Position = "top" | "bottom" | "left" | "right";
type Curve = "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";

interface GradualBlurProps {
  position?: Position;
  strength?: number;
  heightRem?: number;
  widthRem?: number;
  divCount?: number;
  exponential?: boolean;
  opacity?: number;
  curve?: Curve;
  zIndex?: number;
  hoverIntensity?: number;
}

const curves: Record<Curve, (progress: number) => number> = {
  linear: (progress) => progress,
  bezier: (progress) => progress * progress * (3 - 2 * progress),
  "ease-in": (progress) => progress * progress,
  "ease-out": (progress) => 1 - Math.pow(1 - progress, 2),
  "ease-in-out": (progress) => (progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2)
};

function direction(position: Position) {
  return {
    top: "to top",
    bottom: "to bottom",
    left: "to left",
    right: "to right"
  }[position];
}

export function GradualBlur({
  position = "top",
  strength = 5,
  heightRem = 6,
  widthRem = 8,
  divCount = 4,
  exponential = false,
  opacity = 1,
  curve = "linear",
  zIndex = 20,
  hoverIntensity = 1
}: GradualBlurProps) {
  const [hovered, setHovered] = useState(false);
  const layerCount = Math.max(1, Math.round(divCount));
  const isVertical = position === "top" || position === "bottom";

  const layers = useMemo(() => {
    const increment = 100 / layerCount;
    const currentStrength = hovered ? strength * hoverIntensity : strength;
    const curveFn = curves[curve] ?? curves.linear;

    return Array.from({ length: layerCount }, (_, index) => {
      const layer = index + 1;
      const progress = curveFn(layer / layerCount);
      const blur = exponential ? Math.pow(2, progress * 4) * 0.0625 * currentStrength : 0.0625 * progress * layerCount * currentStrength;

      const p1 = Math.round((increment * layer - increment) * 10) / 10;
      const p2 = Math.round(increment * layer * 10) / 10;
      const p3 = Math.round((increment * layer + increment) * 10) / 10;
      const p4 = Math.round((increment * layer + increment * 2) * 10) / 10;
      const stops = [`transparent ${p1}%`, `black ${p2}%`];

      if (p3 <= 100) stops.push(`black ${p3}%`);
      if (p4 <= 100) stops.push(`transparent ${p4}%`);

      return {
        position: "absolute",
        inset: 0,
        backgroundColor: "rgb(255 255 255 / 0.001)",
        backdropFilter: `blur(${blur.toFixed(3)}rem)`,
        WebkitBackdropFilter: `blur(${blur.toFixed(3)}rem)`,
        maskImage: `linear-gradient(${direction(position)}, ${stops.join(", ")})`,
        WebkitMaskImage: `linear-gradient(${direction(position)}, ${stops.join(", ")})`
      } satisfies CSSProperties;
    });
  }, [curve, exponential, hovered, hoverIntensity, layerCount, position, strength]);

  const containerStyle: CSSProperties = {
    position: "absolute",
    pointerEvents: hoverIntensity > 1 ? "auto" : "none",
    opacity,
    zIndex,
    ...(isVertical
      ? { height: `${heightRem}rem`, width: "100%", [position]: 0, left: 0, right: 0 }
      : { width: `${widthRem}rem`, height: "100%", [position]: 0, top: 0, bottom: 0 })
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={hoverIntensity > 1 ? () => setHovered(true) : undefined}
      onMouseLeave={hoverIntensity > 1 ? () => setHovered(false) : undefined}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", pointerEvents: "none" }}>
        {layers.map((style, index) => (
          <div key={index} style={style} />
        ))}
      </div>
    </div>
  );
}
