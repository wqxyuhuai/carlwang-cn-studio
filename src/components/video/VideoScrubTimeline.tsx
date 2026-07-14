"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectVideo } from "@/lib/video/videoTypes";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

async function generateVideoThumbs(src: string, count: number) {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("thumbnail metadata timeout")), 8000);
    video.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    video.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("thumbnail metadata failed"));
    };
    video.src = src;
    video.load();
  });

  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
  const canvas = document.createElement("canvas");
  const width = 96;
  const height = 54;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return [];

  const thumbs: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const target = duration * ((index + 0.5) / count);
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("thumbnail seek timeout")), 5000);
      video.onseeked = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("thumbnail seek failed"));
      };
      video.currentTime = clamp(target / duration) * duration;
    });
    context.drawImage(video, 0, 0, width, height);
    thumbs.push(canvas.toDataURL("image/jpeg", 0.72));
  }

  video.removeAttribute("src");
  video.load();
  return thumbs;
}

export function VideoScrubTimeline({
  currentTime,
  duration,
  isActive,
  onSeek,
  video
}: {
  currentTime: number;
  duration: number;
  isActive: boolean;
  onSeek: (time: number) => void;
  video: ProjectVideo;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [generatedThumbs, setGeneratedThumbs] = useState<{ items: string[]; key: string } | null>(null);
  const requestedFrameCount = Math.max(1, Math.trunc(video.spriteFrameCount || 8));
  const spriteColumns = Math.max(1, Math.trunc(video.spriteColumns || requestedFrameCount));
  const spriteRows = Math.max(1, Math.trunc(video.spriteRows || Math.ceil(requestedFrameCount / spriteColumns)));
  const frameCount = video.spriteSrc ? Math.min(requestedFrameCount, spriteColumns * spriteRows) : requestedFrameCount;
  const thumbnailKey = `${video.src}|${frameCount}`;
  const progress = duration > 0 ? clamp(currentTime / duration) : 0;
  const hoverProgress = hoverTime !== null && duration > 0 ? clamp(hoverTime / duration) : progress;
  const hoverTimeEdgeClass = hoverProgress < 0.08 ? "is-start" : hoverProgress > 0.92 ? "is-end" : "";
  const fallbackThumbs = useMemo(
    () => (!video.spriteSrc && video.poster ? Array.from({ length: frameCount }, () => video.poster as string) : []),
    [frameCount, video.poster, video.spriteSrc]
  );
  const thumbs = generatedThumbs?.key === thumbnailKey ? generatedThumbs.items : fallbackThumbs;

  useEffect(() => {
    let cancelled = false;
    if (!isActive || video.spriteSrc) return;

    generateVideoThumbs(video.src, frameCount)
      .then((items) => {
        if (!cancelled && items.length > 0) setGeneratedThumbs({ items, key: thumbnailKey });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [frameCount, isActive, thumbnailKey, video.spriteSrc, video.src]);

  const spriteFrames = useMemo(() => {
    if (!video.spriteSrc) return [];
    return Array.from({ length: frameCount }, (_, index) => {
      const column = index % spriteColumns;
      const row = Math.floor(index / spriteColumns);
      return {
        backgroundImage: `url(${video.spriteSrc})`,
        backgroundPosition: `${spriteColumns === 1 ? 0 : (column / (spriteColumns - 1)) * 100}% ${
          spriteRows === 1 ? 0 : (row / (spriteRows - 1)) * 100
        }%`,
        backgroundSize: `${spriteColumns * 100}% ${spriteRows * 100}%`
      } as CSSProperties;
    });
  }, [frameCount, spriteColumns, spriteRows, video.spriteSrc]);

  function timeFromClientX(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || duration <= 0) return 0;
    return clamp((clientX - rect.left) / rect.width) * duration;
  }

  function seekFromClientX(clientX: number) {
    const nextTime = timeFromClientX(clientX);
    setHoverTime(nextTime);
    onSeek(nextTime);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsScrubbing(true);
    seekFromClientX(event.clientX);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const nextTime = timeFromClientX(event.clientX);
    setHoverTime(nextTime);
    if (isScrubbing) onSeek(nextTime);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsScrubbing(false);
    seekFromClientX(event.clientX);
  }

  return (
    <div
      aria-label="Video timeline"
      aria-valuemax={duration || 0}
      aria-valuemin={0}
      aria-valuenow={currentTime || 0}
      className="video-scrub-timeline"
      onPointerDown={handlePointerDown}
      onPointerLeave={() => {
        if (!isScrubbing) setHoverTime(null);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={trackRef}
      role="slider"
      style={{ "--video-hover-progress": `${hoverProgress * 100}%`, "--video-progress": `${progress * 100}%` } as CSSProperties}
      tabIndex={0}
    >
      <div className="video-scrub-strip">
        {video.spriteSrc ? (
          spriteFrames.map((style, index) => <span className="video-scrub-thumb is-sprite" key={index} style={style} />)
        ) : thumbs.length > 0 ? (
          thumbs.map((thumb, index) => <span className="video-scrub-thumb" key={`${thumb}-${index}`} style={{ backgroundImage: `url(${thumb})` }} />)
        ) : (
          Array.from({ length: frameCount }, (_, index) => <span className="video-scrub-thumb is-loading" key={index} />)
        )}
      </div>
      <span className="video-scrub-progress" />
      {hoverTime !== null ? <span className={["video-scrub-time", hoverTimeEdgeClass].filter(Boolean).join(" ")}>{formatTime(hoverTime)}</span> : null}
    </div>
  );
}
