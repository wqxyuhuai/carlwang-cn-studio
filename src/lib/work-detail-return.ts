export const workReturnHrefKey = "cw-work-return-href";
export const lastWorksHrefKey = "cw-last-works-href";
export const workReturnHrefParam = "from";

function clientOrigin() {
  return typeof window === "undefined" ? "http://localhost" : window.location.origin;
}

export function normalizeWorksHref(href: string) {
  return href.replace("#works-list", "#works-index");
}

export function isWorkDetailHref(href: string) {
  try {
    const url = new URL(href, clientOrigin());
    return /^\/works\/[^/]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function validWorkReturnHref(href: string | null) {
  if (!href || typeof window === "undefined") return null;

  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin || isWorkDetailHref(href)) return null;
    return normalizeWorksHref(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return null;
  }
}

export function workDetailHrefWithReturn(workHref: string, returnHref: string | null | undefined) {
  if (!returnHref) return workHref;

  const normalizedReturnHref = normalizeWorksHref(returnHref);
  const hashIndex = workHref.indexOf("#");
  const hrefWithoutHash = hashIndex >= 0 ? workHref.slice(0, hashIndex) : workHref;
  const hash = hashIndex >= 0 ? workHref.slice(hashIndex) : "";
  const separator = hrefWithoutHash.includes("?") ? "&" : "?";

  return `${hrefWithoutHash}${separator}${workReturnHrefParam}=${encodeURIComponent(normalizedReturnHref)}${hash}`;
}

export function currentWorkSurfaceHref(defaultHash = "#works") {
  if (typeof window === "undefined") return `/${defaultHash}`;
  return `${window.location.pathname}${window.location.search}${window.location.hash || defaultHash}`;
}

export function rememberLastWorksHref(href: string) {
  if (typeof window === "undefined") return;

  const validHref = validWorkReturnHref(href);
  if (!validHref) return;

  const url = new URL(validHref, window.location.origin);
  const isWorksSurface =
    url.pathname === "/" &&
    (url.hash === "#works" || url.hash === "#works-index" || url.hash === "#works-list");

  if (isWorksSurface) {
    window.sessionStorage.setItem(lastWorksHrefKey, normalizeWorksHref(validHref));
  }
}

export function rememberWorkReturnHref(href = currentWorkSurfaceHref()) {
  if (typeof window === "undefined") return;

  const validHref = validWorkReturnHref(href);
  if (!validHref) return;

  window.sessionStorage.setItem(workReturnHrefKey, validHref);
  rememberLastWorksHref(validHref);
}
