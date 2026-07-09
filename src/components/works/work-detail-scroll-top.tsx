"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

function getScrollTarget() {
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

function getInlineStart() {
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

export function WorkDetailScrollTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [inlineStart, setInlineStart] = useState<number | null>(null);

  useEffect(() => {
    const target = getScrollTarget();
    if (!target) return;

    function updateState() {
      setIsVisible(currentScrollTop(target) > 180);
      setInlineStart(getInlineStart());
    }

    updateState();
    target.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);

    return () => {
      target.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
    };
  }, []);

  function scrollToTop() {
    scrollTargetToTop(getScrollTarget());
  }

  return (
    <button
      aria-label="Back to top"
      className={`pw-detail-scroll-top${isVisible ? " is-visible" : ""}`}
      onClick={scrollToTop}
      style={inlineStart === null ? undefined : ({ "--detail-scroll-top-left": `${inlineStart}px` } as CSSProperties)}
      type="button"
    >
      <span className="pw-detail-arrow is-right pw-detail-scroll-top-glyph" aria-hidden="true" />
    </button>
  );
}
