"use client";

import type { MouseEvent, PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { lastWorksHrefKey, validWorkReturnHref, workReturnHrefKey, workReturnHrefParam } from "@/lib/work-detail-return";

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
  const pendingCloseRef = useRef(false);
  const [isClosing, setIsClosing] = useState(false);

  const closeDetail = useCallback(() => {
    if (pendingCloseRef.current) return;

    pendingCloseRef.current = true;
    setIsClosing(true);
    const closeHref = resolveCloseHref(fallbackHref);
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
      className={`pw-detail-close${isClosing ? " is-closing" : ""}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      type="button"
    >
      <span aria-hidden="true" />
    </button>
  );
}
