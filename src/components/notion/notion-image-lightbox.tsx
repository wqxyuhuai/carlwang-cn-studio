"use client";

import Image from "next/image";
import type { MouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RevealMedia } from "@/components/common/RevealMedia";

const CLOSE_DURATION_MS = 220;

export function NotionImageLightbox({
  alt,
  height,
  index,
  src,
  width
}: {
  alt: string;
  height: number;
  index: number;
  src: string;
  width: number;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const openFrameRef = useRef<number | null>(null);
  const restoreFocusRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const close = useCallback(() => {
    if (!isMounted) return;

    setIsVisible(false);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setIsMounted(false);
      if (restoreFocusRef.current) {
        triggerRef.current?.focus({ preventScroll: true });
      }
      restoreFocusRef.current = false;
    }, CLOSE_DURATION_MS);
  }, [isMounted]);

  function open(event: MouseEvent<HTMLButtonElement>) {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    restoreFocusRef.current = event.detail === 0;
    setIsMounted(true);
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) close();
  }

  useEffect(() => {
    if (!isMounted) return;

    openFrameRef.current = window.requestAnimationFrame(() => {
      setIsVisible(true);
      overlayRef.current?.focus({ preventScroll: true });
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      close();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (openFrameRef.current) window.cancelAnimationFrame(openFrameRef.current);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, isMounted]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (openFrameRef.current) window.cancelAnimationFrame(openFrameRef.current);
    },
    []
  );

  return (
    <>
      <button
        aria-label={alt ? `Enlarge ${alt}` : "Enlarge project image"}
        className="notion-image-trigger"
        onClick={open}
        ref={triggerRef}
        type="button"
      >
        <RevealMedia className="notion-media-frame" index={index}>
          <Image alt={alt} height={height} sizes="(max-width: 900px) 100vw, 50vw" src={src} width={width} />
        </RevealMedia>
      </button>

      {isMounted
        ? createPortal(
            <div
              aria-label="Expanded project image"
              aria-modal="true"
              className={`notion-image-lightbox${isVisible ? " is-visible" : ""}`}
              onClick={handleBackdropClick}
              ref={overlayRef}
              role="dialog"
              tabIndex={-1}
            >
              <Image
                alt={alt}
                className="notion-image-lightbox-media"
                height={height}
                priority
                sizes="calc(100vw - 2rem)"
                src={src}
                width={width}
              />
            </div>,
            document.body
          )
        : null}
    </>
  );
}
