"use client";

import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { RevealMedia } from "@/components/common/RevealMedia";
import { VideoFullscreenPlayer } from "./VideoFullscreenPlayer";
import type { ProjectVideo } from "@/lib/video/videoTypes";

const PLAY_BADGE_OFFSET = 20;

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
  const fullscreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: PLAY_BADGE_OFFSET, y: PLAY_BADGE_OFFSET });
  const currentRef = useRef({ x: PLAY_BADGE_OFFSET, y: PLAY_BADGE_OFFSET });
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
    const tick = () => {
      const target = targetRef.current;
      const current = currentRef.current;
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;
      if (bubbleRef.current) {
        bubbleRef.current.style.setProperty("--video-play-x", `${current.x}px`);
        bubbleRef.current.style.setProperty("--video-play-y", `${current.y}px`);
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function updateTarget(clientX: number, clientY: number) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = Math.max(PLAY_BADGE_OFFSET, Math.min(clientX - rect.left, rect.width - PLAY_BADGE_OFFSET));
    const y = Math.max(PLAY_BADGE_OFFSET, Math.min(clientY - rect.top, rect.height - PLAY_BADGE_OFFSET));
    targetRef.current = { x, y };
  }

  function resetTarget() {
    targetRef.current = { x: PLAY_BADGE_OFFSET, y: PLAY_BADGE_OFFSET };
  }

  function syncCurrentToTarget() {
    currentRef.current = { ...targetRef.current };
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    updateTarget(event.clientX, event.clientY);
  }

  function handleMouseMove(event: MouseEvent<HTMLButtonElement>) {
    updateTarget(event.clientX, event.clientY);
  }

  function playFullscreenVideo() {
    const element = fullscreenVideoRef.current;
    if (!element) return;
    element.muted = false;
    void element.play().catch(() => {
      // The player remains open with visible controls so playback can be retried.
    });
  }

  function openFullscreenVideo() {
    flushSync(() => setIsOpen(true));
    playFullscreenVideo();
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
            syncCurrentToTarget();
          }}
          onPointerLeave={() => {
            setIsHovering(false);
            resetTarget();
          }}
          onPointerMove={handlePointerMove}
          onMouseEnter={(event) => {
            setIsHovering(true);
            handleMouseMove(event);
            syncCurrentToTarget();
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
        onClose={() => {
          setIsOpen(false);
        }}
        video={video}
        videoElementRef={fullscreenVideoRef}
      />
    </>
  );
}
