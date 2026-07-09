"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { lastWorksHrefKey, validWorkReturnHref, workReturnHrefKey } from "@/lib/work-detail-return";

export function WorkDetailClose({ fallbackHref = "/#works" }: { fallbackHref?: string }) {
  const router = useRouter();

  const closeDetail = useCallback(() => {
    const storedReturnHref = validWorkReturnHref(window.sessionStorage.getItem(workReturnHrefKey));
    const lastWorksHref = validWorkReturnHref(window.sessionStorage.getItem(lastWorksHrefKey));
    const referrerHref =
      document.referrer && document.referrer.startsWith(window.location.origin)
        ? validWorkReturnHref(`${new URL(document.referrer).pathname}${new URL(document.referrer).search}${new URL(document.referrer).hash}`)
        : null;

    window.sessionStorage.removeItem(workReturnHrefKey);
    router.replace(storedReturnHref || referrerHref || lastWorksHref || fallbackHref);
  }, [fallbackHref, router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDetail();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeDetail]);

  return (
    <button className="pw-detail-close" type="button" aria-label="Close work detail" onClick={closeDetail}>
      <span aria-hidden="true" />
    </button>
  );
}
