"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { rememberWorkReturnHref, validWorkReturnHref, workDetailHrefWithReturn, workReturnHrefKey, workReturnHrefParam } from "@/lib/work-detail-return";

function resolveCurrentReturnHref() {
  const paramReturnHref = validWorkReturnHref(new URLSearchParams(window.location.search).get(workReturnHrefParam));
  const storedReturnHref = validWorkReturnHref(window.sessionStorage.getItem(workReturnHrefKey));
  return paramReturnHref || storedReturnHref;
}

export function WorkDetailPagerLink({
  children,
  className,
  href
}: {
  children: ReactNode;
  className: string;
  href: string;
}) {
  const router = useRouter();
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const returnHref = resolveCurrentReturnHref();
    linkRef.current?.setAttribute("href", workDetailHrefWithReturn(href, returnHref));
  }, [href]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    const returnHref = resolveCurrentReturnHref();
    if (returnHref) rememberWorkReturnHref(returnHref);
    router.replace(workDetailHrefWithReturn(href, returnHref), { scroll: false });
  }

  return (
    <Link className={className} href={href} onClick={handleClick} prefetch={false} ref={linkRef}>
      {children}
    </Link>
  );
}
