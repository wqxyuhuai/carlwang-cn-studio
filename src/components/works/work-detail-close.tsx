"use client";

import { useCallback, useEffect } from "react";
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

export function WorkDetailClose({ fallbackHref = "/#works" }: { fallbackHref?: string }) {
  const router = useRouter();

  const closeDetail = useCallback(() => {
    window.sessionStorage.removeItem(workReturnHrefKey);
    router.replace(resolveCloseHref(fallbackHref));
  }, [fallbackHref, router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (document.querySelector(".video-player-overlay")) return;
      if (event.key === "Escape") closeDetail();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeDetail]);

  useEffect(() => {
    router.prefetch(resolveCloseHref(fallbackHref));
  }, [fallbackHref, router]);

  return (
    <button className="pw-detail-close" type="button" aria-label="Close work detail" onClick={closeDetail}>
      <span aria-hidden="true" />
    </button>
  );
}
