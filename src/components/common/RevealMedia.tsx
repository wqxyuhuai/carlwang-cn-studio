"use client";

import type { CSSProperties, ReactNode, SyntheticEvent } from "react";
import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import { detailMediaRevealConfig } from "@/lib/motion-config";

type RevealElement = "div" | "figure" | "span";

type RevealBaseProps = {
  children?: ReactNode;
  className?: string;
  delay?: number;
  element?: RevealElement;
  groupIndex?: number;
  index?: number;
  once?: boolean;
  style?: CSSProperties;
};

type RevealWrapperProps = RevealBaseProps & {
  as?: "wrapper";
};

type RevealImageProps = RevealBaseProps &
  Omit<ImageProps, "alt" | "className" | "onLoad" | "src"> & {
    alt: string;
    as: "image";
    imageClassName?: string;
    onLoad?: ImageProps["onLoad"];
    src: ImageProps["src"];
  };

type RevealMediaProps = RevealWrapperProps | RevealImageProps;

function revealDelay({ delay, groupIndex, index }: Pick<RevealBaseProps, "delay" | "groupIndex" | "index">) {
  if (typeof delay === "number") return Math.max(0, delay);
  return Math.min(
    (groupIndex ?? index ?? 0) * detailMediaRevealConfig.staggerMs,
    detailMediaRevealConfig.maxDelayMs
  );
}

function elementIsLoaded(element: Element) {
  if (element instanceof HTMLImageElement) {
    return element.complete && element.naturalWidth > 0;
  }
  if (element instanceof HTMLVideoElement) {
    return element.readyState >= 1;
  }
  return true;
}

function containedMediaLoaded(root: HTMLElement | null) {
  if (!root) return false;
  const media = Array.from(root.querySelectorAll("img, video"));
  if (media.length === 0) return true;
  return media.every(elementIsLoaded);
}

function hasTrackedMedia(root: HTMLElement | null) {
  return Boolean(root?.querySelector("img, video"));
}

function elementInViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  return (
    rect.top < viewportHeight * (1 + detailMediaRevealConfig.triggerLeadViewportRatio) &&
    rect.bottom > 0 &&
    rect.left < viewportWidth &&
    rect.right > 0
  );
}

export function RevealMedia(props: RevealMediaProps) {
  const {
    children,
    className = "",
    delay,
    element = "div",
    groupIndex,
    index = 0,
    once = true,
    style
  } = props;
  const ref = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const computedDelay = revealDelay({ delay, groupIndex, index });
  const revealStyle = {
    ...style,
    "--reveal-delay": `${computedDelay}ms`,
    "--reveal-duration": `${detailMediaRevealConfig.durationMs}ms`
  } as CSSProperties;
  const isVisible = isInView && isLoaded;
  const rootClassName = ["reveal-media", isVisible ? "is-visible" : "", className].filter(Boolean).join(" ");

  const rootRef = (node: HTMLElement | null) => {
    ref.current = node;
  };

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const markInView = () => setIsInView(true);
    const frame = window.requestAnimationFrame(() => {
      if (elementInViewport(node)) markInView();
    });

    if (!("IntersectionObserver" in window)) {
      markInView();
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          markInView();
          if (once) observer.disconnect();
        } else if (!once) {
          setIsInView(false);
        }
      },
      {
        root: null,
        rootMargin: detailMediaRevealConfig.triggerRootMargin,
        threshold: detailMediaRevealConfig.triggerThreshold
      }
    );

    observer.observe(node);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [once]);

  useEffect(() => {
    const node = ref.current;
    if (containedMediaLoaded(node)) {
      setIsLoaded(true);
      return;
    }

    const fallback = window.setTimeout(() => {
      if (!hasTrackedMedia(node) || containedMediaLoaded(node) || node?.querySelector("video")) {
        setIsLoaded(true);
      }
    }, 120);

    return () => window.clearTimeout(fallback);
  }, []);

  function handleMediaLoaded() {
    if (containedMediaLoaded(ref.current)) {
      setIsLoaded(true);
    }
  }

  function renderWrapper(content: ReactNode) {
    if (element === "figure") {
      return (
        <figure
          className={rootClassName}
          onLoadCapture={handleMediaLoaded}
          ref={rootRef}
          style={revealStyle}
        >
          {content}
        </figure>
      );
    }

    if (element === "span") {
      return (
        <span
          className={rootClassName}
          onLoadCapture={handleMediaLoaded}
          ref={rootRef}
          style={revealStyle}
        >
          {content}
        </span>
      );
    }

    return (
      <div
        className={rootClassName}
        onLoadCapture={handleMediaLoaded}
        ref={rootRef}
        style={revealStyle}
      >
        {content}
      </div>
    );
  }

  if (props.as === "image") {
    const { alt, imageClassName, onLoad, src, ...imageProps } = props;
    return renderWrapper(
      <Image
        {...imageProps}
        alt={alt}
        className={imageClassName}
        onLoad={(event: SyntheticEvent<HTMLImageElement>) => {
          setIsLoaded(true);
          onLoad?.(event);
        }}
        onLoadingComplete={() => {
          setIsLoaded(true);
        }}
        src={src}
      />
    );
  }

  return renderWrapper(children);
}
