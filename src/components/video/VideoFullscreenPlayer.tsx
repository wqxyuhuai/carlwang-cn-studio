"use client";

import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { VideoControls } from "./VideoControls";
import type { ProjectVideo } from "@/lib/video/videoTypes";

function supportsReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const useVideoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function recordPlaybackError(element: HTMLVideoElement, error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  element.dataset.playbackError = message;
}

function isPlaybackPolicyError(error: unknown) {
  return error instanceof DOMException && error.name === "NotAllowedError";
}

function getRenderedVideoRect(element: HTMLVideoElement) {
  const bounds = element.getBoundingClientRect();
  const videoWidth = element.videoWidth || bounds.width;
  const videoHeight = element.videoHeight || bounds.height;

  if (!videoWidth || !videoHeight || !bounds.width || !bounds.height) return bounds;

  const videoRatio = videoWidth / videoHeight;
  const boundsRatio = bounds.width / bounds.height;

  if (boundsRatio > videoRatio) {
    const width = bounds.height * videoRatio;
    const left = bounds.left + (bounds.width - width) / 2;
    return new DOMRect(left, bounds.top, width, bounds.height);
  }

  const height = bounds.width / videoRatio;
  const top = bounds.top + (bounds.height - height) / 2;
  return new DOMRect(bounds.left, top, bounds.width, height);
}

function isPointInsideRect(x: number, y: number, rect: DOMRect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function VideoFullscreenPlayer({
  isOpen,
  onClose,
  video
}: {
  isOpen: boolean;
  onClose: () => void;
  video: ProjectVideo;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const closeBubbleRef = useRef<HTMLSpanElement | null>(null);
  const cloudRef = useRef<HTMLSpanElement | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const bubbleRef = useRef({ x: 0, y: 0 });
  const auraRef = useRef({ x: 0, y: 0 });
  const [isClosing, setIsClosing] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const [mediaStatus, setMediaStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isPointerOnVideo, setIsPointerOnVideo] = useState(false);
  const [duration, setDuration] = useState(video.duration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [frameSize, setFrameSize] = useState<{ height: number; width: number } | null>(null);

  const closePlayer = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(() => {
      setHasStartedPlayback(false);
      setIsPlaying(false);
      setMediaStatus("loading");
      setCurrentTime(0);
      onClose();
      setIsClosing(false);
    }, supportsReducedMotion() ? 0 : 460);
  }, [isClosing, onClose]);

  function togglePlay() {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) {
      if (element.ended || (Number.isFinite(element.duration) && element.currentTime >= element.duration - 0.05)) {
        element.currentTime = 0;
        setCurrentTime(0);
      }
      element.muted = false;
      setMediaStatus(element.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA ? "ready" : "loading");
      void element.play().catch((error) => {
        recordPlaybackError(element, error);
        setMediaStatus(isPlaybackPolicyError(error) && element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA ? "ready" : "error");
      });
    } else {
      element.pause();
    }
  }

  function toggleMute() {
    const element = videoRef.current;
    if (!element) return;
    element.muted = !element.muted;
    setIsMuted(element.muted);
  }

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    videoRef.current?.pause();
  }, [isOpen, video.src, videoRef]);

  useEffect(() => {
    if (isClosing) videoRef.current?.pause();
  }, [isClosing, videoRef]);

  useVideoLayoutEffect(() => {
    if (!isOpen) return;
    const element = videoRef.current;
    if (!element) return;

    element.muted = false;
    element.preload = "auto";

    const syncState = () => {
      setIsPlaying(!element.paused);
      setIsMuted(element.muted);
      setCurrentTime(element.currentTime || 0);
      if (Number.isFinite(element.duration)) setDuration(element.duration);
    };
    const syncTime = () => setCurrentTime(element.currentTime || 0);
    const syncDuration = () => {
      if (Number.isFinite(element.duration)) setDuration(element.duration);
      if (element.videoWidth > 0 && element.videoHeight > 0) {
        setAspectRatio(element.videoWidth / element.videoHeight);
      }
    };
    const resetAfterPlayback = () => {
      element.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
      setHasStartedPlayback(false);
      setMediaStatus("ready");
    };

    element.addEventListener("play", syncState);
    element.addEventListener("pause", syncState);
    element.addEventListener("ended", resetAfterPlayback);
    element.addEventListener("loadedmetadata", syncDuration);
    element.addEventListener("timeupdate", syncTime);
    setMediaStatus("loading");
    setIsMuted(false);
    delete element.dataset.playbackError;
    if (element.ended || (Number.isFinite(element.duration) && element.currentTime >= element.duration - 0.05)) {
      element.currentTime = 0;
      setCurrentTime(0);
    }
    void element.play().catch((error) => {
      recordPlaybackError(element, error);
      setMediaStatus(isPlaybackPolicyError(error) && element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA ? "ready" : "error");
    });
    return () => {
      element.removeEventListener("play", syncState);
      element.removeEventListener("pause", syncState);
      element.removeEventListener("ended", resetAfterPlayback);
      element.removeEventListener("loadedmetadata", syncDuration);
      element.removeEventListener("timeupdate", syncTime);
    };
  }, [isOpen, video.src, videoRef]);

  const updateFrameSize = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const bounds = stage.getBoundingClientRect();
    let width = bounds.width;
    let height = width / aspectRatio;

    if (height > bounds.height) {
      height = bounds.height;
      width = height * aspectRatio;
    }

    setFrameSize({ height, width });
  }, [aspectRatio]);

  useEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(updateFrameSize);
    window.addEventListener("resize", updateFrameSize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateFrameSize);
    };
  }, [isOpen, updateFrameSize]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closePlayer();
      }
      if (event.code === "Space") {
        event.preventDefault();
        const element = videoRef.current;
        if (element?.paused) {
          void element.play();
        } else {
          element?.pause();
        }
      }
      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        const element = videoRef.current;
        if (!element) return;
        element.muted = !element.muted;
        setIsMuted(element.muted);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closePlayer, isOpen, videoRef]);

  useEffect(() => {
    if (!isOpen || supportsReducedMotion()) return;

    const tick = () => {
      const target = targetRef.current;
      const bubble = bubbleRef.current;
      const aura = auraRef.current;
      bubble.x += (target.x - bubble.x) * 0.12;
      bubble.y += (target.y - bubble.y) * 0.12;
      aura.x += (target.x - aura.x) * 0.06;
      aura.y += (target.y - aura.y) * 0.06;

      if (closeBubbleRef.current) {
        closeBubbleRef.current.style.transform = `translate3d(${bubble.x}px, ${bubble.y}px, 0) translate(-50%, -50%)`;
      }
      if (cloudRef.current) {
        cloudRef.current.style.transform = `translate3d(${aura.x}px, ${aura.y}px, 0) translate(-50%, -50%)`;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen]);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const element = videoRef.current;
    const nextIsPointerOnVideo = element ? isPointInsideRect(event.clientX, event.clientY, getRenderedVideoRect(element)) : false;

    targetRef.current = { x: event.clientX, y: event.clientY };
    if (bubbleRef.current.x === 0 && bubbleRef.current.y === 0) {
      bubbleRef.current = { x: event.clientX, y: event.clientY };
      auraRef.current = { x: event.clientX, y: event.clientY };
    }
    setIsPointerOnVideo(nextIsPointerOnVideo);
    setIsDimmed(false);
    if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = window.setTimeout(() => setIsDimmed(true), 2000);
  }

  function handlePointerLeave() {
    setIsPointerOnVideo(false);
  }

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    const element = videoRef.current;
    if (!element || !isPointInsideRect(event.clientX, event.clientY, getRenderedVideoRect(element))) return;
    closePlayer();
  }

  function seekTo(time: number) {
    const element = videoRef.current;
    if (!element || !Number.isFinite(time)) return;
    element.currentTime = time;
    setCurrentTime(time);
  }

  return (
    <div
      aria-label="Fullscreen video player"
      aria-hidden={!isOpen}
      className={["video-player-overlay", isClosing ? "is-closing" : "", isDimmed ? "is-idle" : ""].filter(Boolean).join(" ")}
      hidden={!isOpen}
      onClick={handleOverlayClick}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      role="dialog"
    >
      <span className="video-player-backdrop" style={{ backgroundImage: video.poster ? `url(${video.poster})` : undefined }} />
      <span className="video-player-cloud" ref={cloudRef} />
      <span className={["video-cursor-bubble is-close", isPointerOnVideo && !isDimmed ? "is-visible" : ""].filter(Boolean).join(" ")} ref={closeBubbleRef}>
        <span aria-hidden="true" className="video-cursor-glass-effect" />
        <span className="video-cursor-bubble-text">Close</span>
      </span>
      <div className="video-player-stage" ref={stageRef}>
        <div
          className={["video-player-video-frame", `is-${mediaStatus}`, hasStartedPlayback ? "has-started" : ""].filter(Boolean).join(" ")}
          style={
            frameSize
              ? ({
                  blockSize: `${frameSize.height}px`,
                  inlineSize: `${frameSize.width}px`,
                  "--video-aspect-ratio": `${aspectRatio}`,
                  "--video-player-poster": video.poster ? `url("${video.poster}")` : "none"
                } as CSSProperties)
              : ({
                  "--video-aspect-ratio": `${aspectRatio}`,
                  "--video-player-poster": video.poster ? `url("${video.poster}")` : "none"
                } as CSSProperties)
          }
        >
          <video
            className="video-player-video"
            controls={false}
            muted={isMuted}
            onCanPlay={() => setMediaStatus("ready")}
            onError={() => setMediaStatus("error")}
            onLoadedData={() => setMediaStatus("ready")}
            onLoadStart={() => setMediaStatus("loading")}
            onPlaying={() => {
              setHasStartedPlayback(true);
              setMediaStatus("ready");
            }}
            onStalled={() => setMediaStatus("loading")}
            onWaiting={() => setMediaStatus("loading")}
            playsInline
            poster={video.poster}
            preload={isOpen ? "metadata" : "none"}
            ref={videoRef}
            src={video.src}
          />
          <span aria-live="polite" className="video-player-loading-state">
            {mediaStatus === "error" ? (
              <span className="video-player-error-message">Video unavailable. Select play to retry.</span>
            ) : (
              <span aria-hidden="true" className="video-player-loading-track">
                <span />
              </span>
            )}
          </span>
        </div>
      </div>
      <VideoControls
        currentTime={currentTime}
        duration={duration}
        isDimmed={isDimmed}
        isMuted={isMuted}
        isPlaying={isPlaying}
        onSeek={seekTo}
        onToggleMute={toggleMute}
        onTogglePlay={togglePlay}
        video={{ ...video, duration }}
      />
    </div>
  );
}
