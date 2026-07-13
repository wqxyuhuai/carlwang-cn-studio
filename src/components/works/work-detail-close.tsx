"use client";

import type { MouseEvent, PointerEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LiquidGlassFilter, useLiquidGlassSurface } from "@/components/liquid-glass-surface";
import {
  consumeWorkHistoryReturn,
  isWorkDetailHref,
  lastWorksHrefKey,
  rememberWorkReturnHref,
  validWorkReturnHref,
  workReturnHrefKey,
  workReturnHrefParam
} from "@/lib/work-detail-return";

function resolveCloseHref(fallbackHref: string) {
  const paramReturnHref = validWorkReturnHref(new URLSearchParams(window.location.search).get(workReturnHrefParam));
  const storedReturnHref = validWorkReturnHref(window.sessionStorage.getItem(workReturnHrefKey));
  const lastWorksHref = validWorkReturnHref(window.sessionStorage.getItem(lastWorksHrefKey));
  const referrerHref =
    document.referrer && document.referrer.startsWith(window.location.origin)
      ? validWorkReturnHref(`${new URL(document.referrer).pathname}${new URL(document.referrer).search}${new URL(document.referrer).hash}`)
      : null;

  return paramReturnHref || storedReturnHref || referrerHref || lastWorksHref || fallbackHref;
}

function primeReturnSurface(closeHref: string) {
  const target = new URL(closeHref, window.location.origin);
  const isIndex = target.hash === "#works-index" || target.hash === "#works-list";
  document.documentElement.dataset.workTab = isIndex ? "list" : "featured";
  rememberWorkReturnHref(closeHref);
}

export function WorkDetailClose({ fallbackHref = "/?view=grid#works-index" }: { fallbackHref?: string }) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const canReturnThroughHistoryRef = useRef(false);
  const closeHrefRef = useRef<string | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const pendingCloseRef = useRef(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeGlass = useLiquidGlassSurface(closeButtonRef);

  useLayoutEffect(() => {
    const closeHref = resolveCloseHref(fallbackHref);
    closeHrefRef.current = closeHref;
    canReturnThroughHistoryRef.current = consumeWorkHistoryReturn(closeHref);
    primeReturnSurface(closeHref);
  }, [fallbackHref]);

  const closeDetail = useCallback(() => {
    if (pendingCloseRef.current) return;

    pendingCloseRef.current = true;
    setIsClosing(true);
    const closeHref = closeHrefRef.current || resolveCloseHref(fallbackHref);
    primeReturnSurface(closeHref);
    const canReturnThroughHistory = canReturnThroughHistoryRef.current;
    canReturnThroughHistoryRef.current = false;
    if (canReturnThroughHistory) {
      window.history.back();
    } else {
      router.replace(closeHref, { scroll: false });
    }

    fallbackTimerRef.current = window.setTimeout(() => {
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (isWorkDetailHref(currentHref) || validWorkReturnHref(currentHref) !== validWorkReturnHref(closeHref)) {
        window.location.replace(closeHref);
      }
    }, 900);
  }, [fallbackHref, router]);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;

    event.preventDefault();
    closeDetail();
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    closeDetail();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (document.querySelector(".video-player-overlay, .notion-image-lightbox")) return;
      if (event.key === "Escape") closeDetail();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeDetail]);

  useEffect(() => {
    router.prefetch(resolveCloseHref(fallbackHref));
  }, [fallbackHref, router]);

  useEffect(
    () => () => {
      if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current);
    },
    []
  );

  return (
    <button
      aria-label="Close work detail"
      aria-disabled={isClosing}
      className={`cw-liquid-glass-control pw-detail-close ${
        closeGlass.supportsSvgFilter
          ? "cw-liquid-glass-control--svg pw-detail-close--svg"
          : "cw-liquid-glass-control--fallback pw-detail-close--fallback"
      }${isClosing ? " is-closing" : ""}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      ref={closeButtonRef}
      style={closeGlass.style}
      type="button"
    >
      <LiquidGlassFilter surface={closeGlass} />
      <span aria-hidden="true" />
    </button>
  );
}
