"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { smoothWheelConfig } from "@/lib/motion-config";

const nativeWheelSelector = [
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
  "[data-native-wheel]",
  ".notion-image-lightbox",
  ".video-player-overlay"
].join(",");

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizedWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

function isFeaturedHomepage(pathname: string) {
  if (pathname !== "/") return false;

  const view = new URLSearchParams(window.location.search).get("view");
  const hash = window.location.hash;
  const isWorksIndex = view === "grid" || view === "list" || hash === "#works-index" || hash === "#works-list";
  return !isWorksIndex;
}

function canConsumeWheel(element: HTMLElement, delta: number) {
  const maxScrollTop = element.scrollHeight - element.clientHeight;
  return (delta < 0 && element.scrollTop > 0) || (delta > 0 && element.scrollTop < maxScrollTop - 1);
}

function scrollTargetFor(target: Element, delta: number, pageScroller: HTMLElement) {
  let node: Element | null = target;

  while (node && node !== document.body && node !== document.documentElement) {
    const styles = window.getComputedStyle(node);
    const isScrollable = /(auto|scroll)/.test(styles.overflowY) && node.scrollHeight > node.clientHeight + 1;
    if (isScrollable && node instanceof HTMLElement && canConsumeWheel(node, delta)) return node;
    node = node.parentElement;
  }

  return canConsumeWheel(pageScroller, delta) ? pageScroller : null;
}

export function SmoothWheelScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    if (reduceMotion.matches || coarsePointer.matches) return;

    const pageScroller = (document.scrollingElement || document.documentElement) as HTMLElement;

    let activeScroller = pageScroller;
    let current = activeScroller.scrollTop;
    let target = current;
    let animationFrame: number | null = null;
    let previousFrameTime = 0;

    function maximumScrollTop() {
      return Math.max(0, activeScroller.scrollHeight - activeScroller.clientHeight);
    }

    function stopAnimation() {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
      current = activeScroller.scrollTop;
      target = current;
      previousFrameTime = 0;
    }

    function animate(time: number) {
      const frameDuration = previousFrameTime ? Math.min(64, time - previousFrameTime) : 1000 / 60;
      previousFrameTime = time;
      const frameRatio = frameDuration / (1000 / 60);
      const follow = 1 - Math.pow(1 - smoothWheelConfig.follow, frameRatio);
      current += (target - current) * follow;

      const remaining = target - current;
      if (Math.abs(remaining) <= smoothWheelConfig.stopEpsilonPx) {
        current = target;
        activeScroller.scrollTop = target;
        animationFrame = null;
        previousFrameTime = 0;
        return;
      }

      activeScroller.scrollTop = current;
      animationFrame = window.requestAnimationFrame(animate);
    }

    function handleWheel(event: WheelEvent) {
      if (isFeaturedHomepage(pathname)) return;
      if (event.defaultPrevented || event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (!(event.target instanceof Element) || event.target.closest(nativeWheelSelector)) return;

      const delta = normalizedWheelDelta(event);
      if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL && Math.abs(delta) < smoothWheelConfig.activationThresholdPx) return;
      const nextScroller = scrollTargetFor(event.target, delta, pageScroller);
      if (!nextScroller) return;

      event.preventDefault();

      if (nextScroller !== activeScroller) {
        stopAnimation();
        activeScroller = nextScroller;
        current = activeScroller.scrollTop;
        target = current;
      }

      const actualScrollTop = activeScroller.scrollTop;
      if (animationFrame === null || Math.abs(actualScrollTop - current) > 2) {
        current = actualScrollTop;
        target = actualScrollTop;
      }

      const inputStep = clamp(delta, -smoothWheelConfig.maxInputStepPx, smoothWheelConfig.maxInputStepPx);
      const nextTarget = target + inputStep * smoothWheelConfig.inputGain;
      target = clamp(
        nextTarget,
        Math.max(0, current - smoothWheelConfig.maxLagPx),
        Math.min(maximumScrollTop(), current + smoothWheelConfig.maxLagPx)
      );

      if (animationFrame === null) {
        previousFrameTime = 0;
        animationFrame = window.requestAnimationFrame(animate);
      }
    }

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("blur", stopAnimation);
    window.addEventListener("hashchange", stopAnimation);
    window.addEventListener("popstate", stopAnimation);

    return () => {
      stopAnimation();
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("blur", stopAnimation);
      window.removeEventListener("hashchange", stopAnimation);
      window.removeEventListener("popstate", stopAnimation);
    };
  }, [pathname]);

  return null;
}
