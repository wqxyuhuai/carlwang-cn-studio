"use client";

import { useEffect, useRef } from "react";

const interactiveSelector = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[data-cursor-hover]"
].join(",");

export function SiteCursor() {
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

    if (!cursor || reduceMotion.matches || !finePointer.matches) {
      return;
    }

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let frame = 0;
    let hoveringInteractive = false;

    const setHoverState = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      const nextHoveringInteractive = Boolean(element?.closest(interactiveSelector));
      if (hoveringInteractive !== nextHoveringInteractive) {
        hoveringInteractive = nextHoveringInteractive;
        document.body.classList.toggle("is-cursor-hovering", nextHoveringInteractive);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      document.body.classList.add("is-cursor-visible");
      setHoverState(event.target);

      if (frame === 0) {
        frame = window.requestAnimationFrame(animateCursor);
      }
    };

    const animateCursor = () => {
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;
      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;

      if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
        frame = window.requestAnimationFrame(animateCursor);
      } else {
        currentX = targetX;
        currentY = targetY;
        frame = 0;
      }
    };

    document.documentElement.classList.add("has-site-custom-cursor");
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.classList.remove("has-site-custom-cursor");
      document.body.classList.remove("is-cursor-hovering", "is-cursor-visible");
    };
  }, []);

  return <span className="custom-cursor" ref={cursorRef} aria-hidden="true" />;
}
