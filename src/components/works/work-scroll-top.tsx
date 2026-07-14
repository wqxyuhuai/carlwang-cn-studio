"use client";

import type { CSSProperties, RefObject } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { LiquidGlassFilter, useLiquidGlassSurface } from "@/components/liquid-glass-surface";

const subscribePortalRoot = () => () => {};
const getPortalRoot = () => document.body;
const getServerPortalRoot = () => null;

type WorkScrollTopPlacement = "detail" | "index";
const backdropSampleSize = 5;
let backdropSampleCanvas: HTMLCanvasElement | null = null;

function channelLuminance(value: number) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function isLightBackdrop(element: HTMLElement | null) {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  const pointX = rect.left + rect.width / 2;
  const pointY = rect.top + rect.height / 2;
  const image = document.elementsFromPoint(pointX, pointY)
    .find((candidate) => candidate !== element && candidate.tagName === "IMG") as HTMLImageElement | undefined;

  if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return false;

  const imageRect = image.getBoundingClientRect();
  const objectFit = window.getComputedStyle(image).objectFit;
  const scale = objectFit === "contain"
    ? Math.min(imageRect.width / image.naturalWidth, imageRect.height / image.naturalHeight)
    : Math.max(imageRect.width / image.naturalWidth, imageRect.height / image.naturalHeight);
  const renderedWidth = image.naturalWidth * scale;
  const renderedHeight = image.naturalHeight * scale;
  const sourceX = (pointX - imageRect.left - (imageRect.width - renderedWidth) / 2) / scale;
  const sourceY = (pointY - imageRect.top - (imageRect.height - renderedHeight) / 2) / scale;
  const sourceRadius = 16 / scale;
  const sourceLeft = Math.max(0, sourceX - sourceRadius);
  const sourceTop = Math.max(0, sourceY - sourceRadius);
  const sourceWidth = Math.min(image.naturalWidth - sourceLeft, sourceRadius * 2);
  const sourceHeight = Math.min(image.naturalHeight - sourceTop, sourceRadius * 2);

  backdropSampleCanvas ??= document.createElement("canvas");
  backdropSampleCanvas.width = backdropSampleSize;
  backdropSampleCanvas.height = backdropSampleSize;
  const context = backdropSampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!context || sourceWidth <= 0 || sourceHeight <= 0) return false;

  try {
    context.clearRect(0, 0, backdropSampleSize, backdropSampleSize);
    context.drawImage(image, sourceLeft, sourceTop, sourceWidth, sourceHeight, 0, 0, backdropSampleSize, backdropSampleSize);
    const pixels = context.getImageData(0, 0, backdropSampleSize, backdropSampleSize).data;
    let luminance = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      luminance += 0.2126 * channelLuminance(pixels[index])
        + 0.7152 * channelLuminance(pixels[index + 1])
        + 0.0722 * channelLuminance(pixels[index + 2]);
    }

    return luminance / (pixels.length / 4) > 0.58;
  } catch {
    return false;
  }
}

function getScrollTarget(targetRef?: RefObject<HTMLElement | null>) {
  if (targetRef?.current) return targetRef.current;

  const detailRight = document.querySelector<HTMLElement>(".pw-detail-right");
  if (!detailRight) return null;

  const style = window.getComputedStyle(detailRight);
  const canScrollPanel = style.overflowY !== "visible" && detailRight.scrollHeight > detailRight.clientHeight;
  return canScrollPanel ? detailRight : window;
}

function currentScrollTop(target: HTMLElement | Window | null) {
  if (!target) return 0;
  if (target instanceof Window) return window.scrollY || document.documentElement.scrollTop || 0;
  return target.scrollTop;
}

function scrollTargetToTop(target: HTMLElement | Window | null) {
  if (!target) return;
  target.scrollTo({ top: 0, behavior: "smooth" });
}

function getDetailPosition() {
  const detailBody = document.querySelector<HTMLElement>(".pw-detail-body");
  if (!detailBody) return null;

  const buttonSize = 48;
  const bodyGap = 24;
  const viewportGap = 20;
  const bodyRect = detailBody.getBoundingClientRect();
  const preferredLeft = bodyRect.right + bodyGap;
  const maxLeft = window.innerWidth - viewportGap - buttonSize;

  return Math.max(viewportGap, Math.min(preferredLeft, maxLeft));
}

function getIndexPosition(targetRef?: RefObject<HTMLElement | null>) {
  const target = targetRef?.current;
  if (!target) return null;

  const edgeInset = 8;
  const viewportGap = 20;
  const targetRect = target.getBoundingClientRect();
  const positioningWidth = document.body.getBoundingClientRect().width;

  return Math.max(viewportGap, positioningWidth - targetRect.right + edgeInset);
}

function getPosition(placement: WorkScrollTopPlacement, targetRef?: RefObject<HTMLElement | null>) {
  return placement === "index" ? getIndexPosition(targetRef) : getDetailPosition();
}

export function WorkScrollTop({
  targetRef,
  placement = "detail"
}: {
  targetRef?: RefObject<HTMLElement | null>;
  placement?: WorkScrollTopPlacement;
} = {}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const glassSurface = useLiquidGlassSurface(buttonRef);
  const [isVisible, setIsVisible] = useState(false);
  const [isOnLightBackdrop, setIsOnLightBackdrop] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const portalRoot = useSyncExternalStore(subscribePortalRoot, getPortalRoot, getServerPortalRoot);

  useEffect(() => {
    const target = getScrollTarget(targetRef);
    if (!target) return;
    let contrastFrame = 0;

    function updateContrast() {
      window.cancelAnimationFrame(contrastFrame);
      contrastFrame = window.requestAnimationFrame(() => {
        setIsOnLightBackdrop(isLightBackdrop(buttonRef.current));
      });
    }

    function updateState() {
      setIsVisible(currentScrollTop(target) > 180);
      setPosition(getPosition(placement, targetRef));
      updateContrast();
    }

    updateState();
    target.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);
    document.addEventListener("load", updateContrast, true);

    return () => {
      window.cancelAnimationFrame(contrastFrame);
      target.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
      document.removeEventListener("load", updateContrast, true);
    };
  }, [placement, targetRef]);

  function scrollToTop() {
    scrollTargetToTop(getScrollTarget(targetRef));
  }

  const positionStyle = placement === "index"
    ? { "--work-scroll-top-right": `${position ?? 20}px` }
    : position === null
      ? {}
      : { "--work-scroll-top-left": `${position}px` };
  const buttonStyle = { ...glassSurface.style, ...positionStyle } as CSSProperties;

  const button = (
    <button
      aria-label="Back to top"
      className={`pw-scroll-top pw-scroll-top--${placement} ${
        glassSurface.supportsSvgFilter ? "cw-bottom-glass-surface--svg" : "cw-bottom-glass-surface--fallback"
      }${isVisible ? " is-visible" : ""}${isOnLightBackdrop ? " is-on-light" : ""}`}
      onClick={scrollToTop}
      ref={buttonRef}
      style={buttonStyle}
      type="button"
    >
      <LiquidGlassFilter surface={glassSurface} />
      <span className="pw-detail-arrow is-right pw-scroll-top-glyph" aria-hidden="true" />
    </button>
  );

  return portalRoot ? createPortal(button, portalRoot) : null;
}
