"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

export function WorkDetailClose({ fallbackHref = "/#works" }: { fallbackHref?: string }) {
  const router = useRouter();

  const closeDetail = useCallback(() => {
    const storedReturnHref = window.sessionStorage.getItem("cw-work-return-href");
    window.sessionStorage.removeItem("cw-work-return-href");
    router.replace(storedReturnHref || fallbackHref);
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
