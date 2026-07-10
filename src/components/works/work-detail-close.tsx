"use client";

import type { MouseEvent, PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LiquidGlassFilter, useLiquidGlassSurface } from "@/components/liquid-glass-surface";
import { lastWorksHrefKey, rememberLastWorksHref, validWorkReturnHref, workReturnHrefKey, workReturnHrefParam } from "@/lib/work-detail-return";

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

export function WorkDetailClose({ fallbackHref = "/?view=grid#works-index" }: { fallbackHref?: string }) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pendingCloseRef = useRef(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeGlass = useLiquidGlassSurface(closeButtonRef);

  const closeDetail = useCallback(() => {
    if (pendingCloseRef.current) return;

    pendingCloseRef.current = true;
    setIsClosing(true);
    const closeHref = resolveCloseHref(fallbackHref);
    rememberLastWorksHref(closeHref);
    window.sessionStorage.removeItem(workReturnHrefKey);
    router.replace(closeHref);
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

  return (
    <button
      aria-label="Close work detail"
      aria-disabled={isClosing}
      className={`pw-detail-close ${closeGlass.supportsSvgFilter ? "pw-detail-close--svg" : "pw-detail-close--fallback"}${isClosing ? " is-closing" : ""}`}
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
