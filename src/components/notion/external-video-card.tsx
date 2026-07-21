"use client";

import type { MouseEvent, PointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ExternalVideoProvider } from "@/lib/types";

const PLAY_BADGE_OFFSET = 20;
const PLAY_BADGE_FOLLOW_RESPONSE = 0.085;
const PLAY_BADGE_SETTLE_THRESHOLD = 0.1;

function playerUrl(embedUrl: string, autoplay: boolean) {
  try {
    const url = new URL(embedUrl);
    url.searchParams.set("autoplay", autoplay ? "1" : "0");
    return url.href;
  } catch {
    return embedUrl;
  }
}

function ProviderLogo({ provider }: { provider: ExternalVideoProvider }) {
  const paths: Record<ExternalVideoProvider, string> = {
    vimeo:
      "M23.9765 6.4168c-.105 2.338-1.739 5.5429-4.894 9.6088-3.2679 4.247-6.0258 6.3699-8.2898 6.3699-1.409 0-2.578-1.294-3.553-3.881l-1.9179-7.1138c-.719-2.584-1.488-3.878-2.312-3.878-.179 0-.806.378-1.8809 1.132l-1.129-1.457a315.06 315.06 0 003.501-3.1279c1.579-1.368 2.765-2.085 3.5539-2.159 1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.5069.5389 2.45 1.1309 3.674 1.7759 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.8679 3.434-5.7568 6.7619-5.6368 2.4729.06 3.6279 1.664 3.4929 4.7969z",
    bilibili:
      "M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z",
    youtube:
      "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d={paths[provider]} />
    </svg>
  );
}

export function ExternalVideoCard({
  embedUrl,
  posterUrl,
  provider,
  title
}: {
  embedUrl: string;
  posterUrl?: string;
  provider: ExternalVideoProvider;
  title: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const playbackUrl = useMemo(() => playerUrl(embedUrl, true), [embedUrl]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      const target = targetRef.current;
      const current = currentRef.current;
      const response = reduceMotion ? 1 : PLAY_BADGE_FOLLOW_RESPONSE;
      const deltaX = target.x - current.x;
      const deltaY = target.y - current.y;
      current.x += deltaX * response;
      current.y += deltaY * response;
      if (Math.abs(deltaX) < PLAY_BADGE_SETTLE_THRESHOLD) current.x = target.x;
      if (Math.abs(deltaY) < PLAY_BADGE_SETTLE_THRESHOLD) current.y = target.y;
      if (bubbleRef.current) {
        bubbleRef.current.style.setProperty("--video-play-x", `${current.x}px`);
        bubbleRef.current.style.setProperty("--video-play-y", `${current.y}px`);
      }
      const isSettled = current.x === target.x && current.y === target.y;
      rafRef.current = isHovering || !isSettled ? window.requestAnimationFrame(tick) : null;
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isHovering]);

  function updatePlayTarget(clientX: number, clientY: number) {
    const card = triggerRef.current;
    const bubble = bubbleRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const halfWidth = Math.max(PLAY_BADGE_OFFSET, (bubble?.offsetWidth || 0) / 2);
    const halfHeight = Math.max(PLAY_BADGE_OFFSET, (bubble?.offsetHeight || 0) / 2);
    const pointerX = Math.max(halfWidth, Math.min(clientX - rect.left, rect.width - halfWidth));
    const pointerY = Math.max(halfHeight, Math.min(clientY - rect.top, rect.height - halfHeight));
    const restCenterX = bubble ? bubble.offsetLeft + bubble.offsetWidth / 2 : PLAY_BADGE_OFFSET;
    const restCenterY = bubble ? bubble.offsetTop + bubble.offsetHeight / 2 : rect.height - PLAY_BADGE_OFFSET;
    targetRef.current = { x: pointerX - restCenterX, y: pointerY - restCenterY };
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    updatePlayTarget(event.clientX, event.clientY);
  }

  function handleMouseMove(event: MouseEvent<HTMLButtonElement>) {
    updatePlayTarget(event.clientX, event.clientY);
  }

  function resetPlayTarget() {
    targetRef.current = { x: 0, y: 0 };
  }

  const close = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      triggerRef.current?.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 420);
  }, [isClosing]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, isOpen]);

  return (
    <>
      <div
        className={[
          "notion-external-video-card",
          posterUrl ? "has-poster" : "has-no-poster",
          isHovering ? "is-hovering" : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- provider posters come from their public media CDNs
          <img
            alt=""
            aria-hidden="true"
            className="notion-external-video-preview"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={posterUrl}
          />
        ) : null}
        <button
          aria-label={`Play ${title}`}
          className="notion-external-video-trigger"
          onClick={() => setIsOpen(true)}
          onMouseEnter={(event) => {
            setIsHovering(true);
            handleMouseMove(event);
          }}
          onMouseLeave={() => {
            setIsHovering(false);
            resetPlayTarget();
          }}
          onMouseMove={handleMouseMove}
          onPointerEnter={(event) => {
            setIsHovering(true);
            handlePointerMove(event);
          }}
          onPointerLeave={() => {
            setIsHovering(false);
            resetPlayTarget();
          }}
          onPointerMove={handlePointerMove}
          ref={triggerRef}
          type="button"
        >
          <span aria-hidden="true" className="notion-external-video-provider">
            <ProviderLogo provider={provider} />
          </span>
          <span className="project-video-mobile-play" ref={bubbleRef}>
            <span aria-hidden="true" className="video-cursor-glass-effect" />
            <span className="video-cursor-bubble-text">Play</span>
          </span>
        </button>
      </div>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-label={`Fullscreen ${provider} video player`}
              aria-modal="true"
              className={["video-player-overlay", "notion-external-video-overlay", isClosing ? "is-closing" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={close}
              ref={dialogRef}
              role="dialog"
              tabIndex={-1}
            >
              <span className="video-player-backdrop" />
              <span className="video-player-cloud" />
              <button
                aria-label="Close external video"
                className="notion-external-video-close"
                onClick={(event) => {
                  event.stopPropagation();
                  close();
                }}
                type="button"
              >
                Close
              </button>
              <div className="video-player-stage notion-external-video-modal-stage">
                <div
                  className="video-player-video-frame notion-external-video-modal-frame"
                  onClick={(event) => event.stopPropagation()}
                >
                  <iframe
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    src={playbackUrl}
                    title={title}
                  />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
