"use client";

import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { RevealMedia } from "@/components/common/RevealMedia";
import { VideoFullscreenPlayer } from "./VideoFullscreenPlayer";
import type { ProjectVideo } from "@/lib/video/videoTypes";

const PLAY_BADGE_OFFSET = 20;
const PLAY_BADGE_FOLLOW_RESPONSE = 0.085;
const PLAY_BADGE_SETTLE_THRESHOLD = 0.1;

export function ProjectVideoCard({
  className = "",
  revealIndex = 0,
  video
}: {
  className?: string;
  revealIndex?: number;
  video: ProjectVideo;
}) {
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const playerVideoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const previewKey = `${video.src}|${video.poster || ""}`;
  const [posterReadyKey, setPosterReadyKey] = useState<string | null>(null);
  const [videoReadyKey, setVideoReadyKey] = useState<string | null>(null);
  const [posterFailedKey, setPosterFailedKey] = useState<string | null>(null);

  const isPosterReady = posterReadyKey === previewKey;
  const isVideoReady = videoReadyKey === previewKey;
  const hasPosterFailed = posterFailedKey === previewKey;
  const hasPoster = Boolean(video.poster && !hasPosterFailed);
  const isPreviewReady = hasPoster ? isPosterReady : isVideoReady;
  const mediaStyle = video.poster
    ? ({
        "--project-video-poster": `url("${video.poster}")`
      } as CSSProperties)
    : undefined;

  const handlePosterRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (node?.complete && node.naturalWidth > 0) {
        setPosterReadyKey(previewKey);
      }
    },
    [previewKey]
  );

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
      if (isHovering || !isSettled) {
        rafRef.current = window.requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isHovering]);

  function updateTarget(clientX: number, clientY: number) {
    const card = cardRef.current;
    const bubble = bubbleRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const bubbleHalfWidth = Math.max(PLAY_BADGE_OFFSET, (bubble?.offsetWidth || 0) / 2);
    const bubbleHalfHeight = Math.max(PLAY_BADGE_OFFSET, (bubble?.offsetHeight || 0) / 2);
    const pointerX = Math.max(bubbleHalfWidth, Math.min(clientX - rect.left, rect.width - bubbleHalfWidth));
    const pointerY = Math.max(bubbleHalfHeight, Math.min(clientY - rect.top, rect.height - bubbleHalfHeight));
    const restCenterX = bubble ? bubble.offsetLeft + bubble.offsetWidth / 2 : PLAY_BADGE_OFFSET;
    const restCenterY = bubble ? bubble.offsetTop + bubble.offsetHeight / 2 : rect.height - PLAY_BADGE_OFFSET;
    targetRef.current = { x: pointerX - restCenterX, y: pointerY - restCenterY };
  }

  function resetTarget() {
    targetRef.current = { x: 0, y: 0 };
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    updateTarget(event.clientX, event.clientY);
  }

  function handleMouseMove(event: MouseEvent<HTMLButtonElement>) {
    updateTarget(event.clientX, event.clientY);
  }

  function openFullscreenVideo() {
    flushSync(() => setIsOpen(true));
    const element = playerVideoRef.current;
    if (!element) return;
    if (element.ended || (Number.isFinite(element.duration) && element.currentTime >= element.duration - 0.05)) {
      element.currentTime = 0;
    }
    // Opening the fullscreen player is a direct user gesture, so start with
    // sound immediately and keep the visible controls in sync with the media.
    element.muted = false;
    void element.play().catch(() => {
      // The visible player remains ready for an explicit play click if browser policy blocks the initial request.
    });
  }

  return (
    <>
      <RevealMedia className="project-video-reveal" index={revealIndex}>
        <button
          aria-label={`Play ${video.title || "project video"}`}
          className={["project-video-card", className, isHovering ? "is-hovering" : "", isPreviewReady ? "is-preview-ready" : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={openFullscreenVideo}
          onPointerEnter={(event) => {
            setIsHovering(true);
            handlePointerMove(event);
          }}
          onPointerLeave={() => {
            setIsHovering(false);
            resetTarget();
          }}
          onPointerMove={handlePointerMove}
          onMouseEnter={(event) => {
            setIsHovering(true);
            handleMouseMove(event);
          }}
          onMouseLeave={() => {
            setIsHovering(false);
            resetTarget();
          }}
          onMouseMove={handleMouseMove}
          ref={cardRef}
          type="button"
        >
          <span
            className={[
              "project-video-card-media",
              video.poster ? "has-poster" : "",
              isPreviewReady ? "is-preview-ready" : "is-preview-loading"
            ]
              .filter(Boolean)
              .join(" ")}
            style={mediaStyle}
          >
            {video.poster ? (
              // eslint-disable-next-line @next/next/no-img-element -- decorative arbitrary external poster, loaded only as a preview layer
              <img
                alt=""
                aria-hidden="true"
                className="project-video-card-poster"
                onError={() => setPosterFailedKey(previewKey)}
                onLoad={() => setPosterReadyKey(previewKey)}
                ref={handlePosterRef}
                src={video.poster}
              />
            ) : null}
            {!hasPoster ? (
              <video
                aria-hidden="true"
                muted
                onCanPlay={() => setVideoReadyKey(previewKey)}
                onError={() => setVideoReadyKey(previewKey)}
                onLoadedData={() => setVideoReadyKey(previewKey)}
                playsInline
                preload="metadata"
                src={video.src}
              />
            ) : null}
            <span aria-hidden="true" className="project-video-card-loader">
              <span className="project-video-card-loader-track" />
            </span>
          </span>
          <span className="project-video-mobile-play" ref={bubbleRef}>
            <span aria-hidden="true" className="video-cursor-glass-effect" />
            <span className="video-cursor-bubble-text">Play</span>
          </span>
        </button>
      </RevealMedia>
      <VideoFullscreenPlayer
        isOpen={isOpen}
        mediaRef={playerVideoRef}
        onClose={() => {
          setIsOpen(false);
        }}
        video={video}
      />
    </>
  );
}
