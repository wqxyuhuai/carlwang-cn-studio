"use client";

import type { CSSProperties, RefObject } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

export type LiquidGlassSurface = {
  displacementMap: string;
  filterId: string;
  style: CSSProperties;
  supportsSvgFilter: boolean;
};

export function useLiquidGlassSurface(surfaceRef: RefObject<HTMLElement | null>): LiquidGlassSurface {
  const reactId = useId();
  const stableId = useMemo(() => reactId.replace(/[^a-zA-Z0-9_-]/g, ""), [reactId]);
  const filterId = `cw-bottom-glass-filter-${stableId}`;
  const redGradId = `cw-bottom-glass-red-${stableId}`;
  const blueGradId = `cw-bottom-glass-blue-${stableId}`;
  const [displacementMap, setDisplacementMap] = useState("");
  const [supportsSvgFilter, setSupportsSvgFilter] = useState(false);

  const generateDisplacementMap = useCallback(() => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    const styles = surfaceRef.current ? window.getComputedStyle(surfaceRef.current) : null;
    const actualWidth = Math.max(1, Math.round(rect?.width || 380));
    const actualHeight = Math.max(1, Math.round(rect?.height || 56));
    const radius = styles ? Number.parseFloat(styles.borderTopLeftRadius) || 12 : 12;
    const edgeSize = Math.min(actualWidth, actualHeight) * 0.035;

    const svgContent = `
      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${radius}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${radius}" fill="url(#${blueGradId})" style="mix-blend-mode: difference" />
        <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${radius}" fill="hsl(0 0% 50% / 0.93)" style="filter: blur(11px)" />
      </svg>
    `;

    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  }, [blueGradId, redGradId, surfaceRef]);

  const updateDisplacementMap = useCallback(() => {
    setDisplacementMap(generateDisplacementMap());
  }, [generateDisplacementMap]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 760px), (pointer: coarse)");
    const updateFilterSupport = () => {
      const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      const isFirefox = /Firefox/.test(navigator.userAgent);
      const supportsUrlFilter =
        Boolean(window.CSS?.supports("backdrop-filter", `url(#${filterId})`)) ||
        Boolean(window.CSS?.supports("-webkit-backdrop-filter", `url(#${filterId})`));

      setSupportsSvgFilter(!mediaQuery.matches && !isWebkit && !isFirefox && supportsUrlFilter);
    };

    const frame = window.requestAnimationFrame(updateFilterSupport);
    mediaQuery.addEventListener("change", updateFilterSupport);

    return () => {
      window.cancelAnimationFrame(frame);
      mediaQuery.removeEventListener("change", updateFilterSupport);
    };
  }, [filterId]);

  useEffect(() => {
    if (typeof window === "undefined" || !supportsSvgFilter) return;

    const element = surfaceRef.current;
    let frame = window.requestAnimationFrame(updateDisplacementMap);

    if (!element || typeof ResizeObserver === "undefined") {
      return () => window.cancelAnimationFrame(frame);
    }

    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateDisplacementMap);
    });

    resizeObserver.observe(element);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [surfaceRef, supportsSvgFilter, updateDisplacementMap]);

  const style = useMemo(
    () =>
      ({
        "--cw-bottom-glass-filter": `url(#${filterId})`
      }) as CSSProperties,
    [filterId]
  );

  return { displacementMap, filterId, style, supportsSvgFilter };
}

export function LiquidGlassFilter({ surface }: { surface: LiquidGlassSurface }) {
  return (
    <svg
      aria-hidden="true"
      className="cw-glass-filter"
      style={{ blockSize: "100%", height: "100%", inlineSize: "100%", inset: 0, opacity: 0, pointerEvents: "none", position: "absolute", width: "100%", zIndex: -1 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={surface.filterId} colorInterpolationFilters="sRGB" height="100%" width="100%" x="0%" y="0%">
          <feImage height="100%" href={surface.displacementMap || undefined} preserveAspectRatio="none" result="map" width="100%" x="0" y="0" />
          <feDisplacementMap in="SourceGraphic" in2="map" result="dispRed" scale="-180" xChannelSelector="R" yChannelSelector="G" />
          <feColorMatrix in="dispRed" result="red" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
          <feDisplacementMap in="SourceGraphic" in2="map" result="dispGreen" scale="-170" xChannelSelector="R" yChannelSelector="G" />
          <feColorMatrix in="dispGreen" result="green" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" />
          <feDisplacementMap in="SourceGraphic" in2="map" result="dispBlue" scale="-160" xChannelSelector="R" yChannelSelector="G" />
          <feColorMatrix in="dispBlue" result="blue" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" />
          <feBlend in="red" in2="green" mode="screen" result="rg" />
          <feBlend in="rg" in2="blue" mode="screen" result="output" />
          <feGaussianBlur in="output" stdDeviation="0" />
        </filter>
      </defs>
    </svg>
  );
}
