"use client";

import type { MouseEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { VideoFullscreenPlayer } from "./VideoFullscreenPlayer";
import type { ProjectVideo } from "@/lib/video/videoTypes";

export function ProjectVideoCard({
  className = "",
  video
}: {
  className?: string;
  video: ProjectVideo;
}) {
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const tick = () => {
      const target = targetRef.current;
      const current = currentRef.current;
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;
      if (bubbleRef.current) {
        bubbleRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function updateTarget(clientX: number, clientY: number) {
    targetRef.current = { x: clientX, y: clientY };
    if (currentRef.current.x === 0 && currentRef.current.y === 0) {
      currentRef.current = { x: clientX, y: clientY };
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    updateTarget(event.clientX, event.clientY);
  }

  function handleMouseMove(event: MouseEvent<HTMLButtonElement>) {
    updateTarget(event.clientX, event.clientY);
  }

  return (
    <>
      <button
        aria-label={`Play ${video.title || "project video"}`}
        className={["project-video-card", className, isHovering ? "is-hovering" : ""].filter(Boolean).join(" ")}
        onClick={() => setIsOpen(true)}
        onPointerEnter={(event) => {
          setIsHovering(true);
          handlePointerMove(event);
        }}
        onPointerLeave={() => setIsHovering(false)}
        onPointerMove={handlePointerMove}
        onMouseEnter={(event) => {
          setIsHovering(true);
          handleMouseMove(event);
        }}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={handleMouseMove}
        type="button"
      >
        <span className="project-video-card-media">
          <video aria-hidden="true" muted playsInline poster={video.poster} preload="metadata" src={video.src} />
        </span>
        <span className="project-video-mobile-play">
          <span aria-hidden="true" className="video-cursor-glass-effect" />
          <span className="video-cursor-bubble-text">Play</span>
        </span>
      </button>
      <span className={["video-cursor-bubble is-play", isHovering ? "is-visible" : ""].filter(Boolean).join(" ")} ref={bubbleRef}>
        <span aria-hidden="true" className="video-cursor-glass-effect" />
        <span className="video-cursor-bubble-text">Play</span>
      </span>
      {isOpen ? <VideoFullscreenPlayer onClose={() => setIsOpen(false)} video={video} /> : null}
    </>
  );
}
