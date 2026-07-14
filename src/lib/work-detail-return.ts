export const workReturnHrefKey = "cw-work-return-href";
export const lastWorksHrefKey = "cw-last-works-href";
export const workReturnScrollKey = "cw-work-return-scroll";
export const workReturnHrefParam = "from";
const workNavigationEntryKey = "cw-work-navigation-entry";

type WorkReturnScroll = {
  href: string;
  panelTop: number;
  surfaceTop: number;
  windowTop: number;
};

function clientOrigin() {
  return typeof window === "undefined" ? "http://localhost" : window.location.origin;
}

export function normalizeWorksHref(href: string) {
  const hashIndex = href.indexOf("#");
  if (hashIndex < 0) return href;

  const baseHref = href.slice(0, hashIndex);
  const hash = href.slice(hashIndex + 1);
  if (hash.startsWith("works-index") || hash.startsWith("works-list")) {
    return `${baseHref}#works-index`;
  }
  return href;
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

export function replaceCurrentHistoryHref(href: string) {
  if (typeof window === "undefined") return;
  window.history.replaceState(window.history.state, "", href);
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

export function rememberWorkNavigation(href = currentWorkSurfaceHref()) {
  rememberWorkReturnHref(href);

  const validHref = validWorkReturnHref(href);
  if (!validHref || typeof performance === "undefined") return;

  window.sessionStorage.setItem(
    workNavigationEntryKey,
    JSON.stringify({ href: validHref, timeOrigin: performance.timeOrigin })
  );
}

export function canReturnToWorkSurfaceWithHistory(href: string) {
  if (typeof window === "undefined" || typeof performance === "undefined") return false;

  const validHref = validWorkReturnHref(href);
  const storedValue = window.sessionStorage.getItem(workNavigationEntryKey);
  if (!validHref || !storedValue) return false;

  try {
    const entry = JSON.parse(storedValue) as { href?: unknown; timeOrigin?: unknown };
    return (
      validWorkReturnHref(typeof entry.href === "string" ? entry.href : null) === validHref &&
      typeof entry.timeOrigin === "number" &&
      entry.timeOrigin === performance.timeOrigin
    );
  } catch {
    window.sessionStorage.removeItem(workNavigationEntryKey);
    return false;
  }
}

export function forgetWorkNavigationEntry() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(workNavigationEntryKey);
}

export function rememberWorkReturnScroll(href: string, panelTop: number, surfaceTop: number, windowTop: number) {
  if (typeof window === "undefined") return;

  const validHref = validWorkReturnHref(href);
  if (!validHref) return;

  const scrollState: WorkReturnScroll = {
    href: validHref,
    panelTop: Math.max(0, panelTop),
    surfaceTop: Math.max(0, surfaceTop),
    windowTop: Math.max(0, windowTop)
  };
  window.sessionStorage.setItem(workReturnScrollKey, JSON.stringify(scrollState));
}

export function readWorkReturnScroll(href: string) {
  if (typeof window === "undefined") return null;

  const expectedHref = validWorkReturnHref(href);
  const storedValue = window.sessionStorage.getItem(workReturnScrollKey);
  if (!expectedHref || !storedValue) return null;

  try {
    const scrollState = JSON.parse(storedValue) as Partial<WorkReturnScroll>;
    const storedHref = validWorkReturnHref(typeof scrollState.href === "string" ? scrollState.href : null);
    if (storedHref !== expectedHref) return null;

    return {
      panelTop: Number.isFinite(scrollState.panelTop) ? Math.max(0, Number(scrollState.panelTop)) : 0,
      surfaceTop: Number.isFinite(scrollState.surfaceTop) ? Math.max(0, Number(scrollState.surfaceTop)) : 0,
      windowTop: Number.isFinite(scrollState.windowTop) ? Math.max(0, Number(scrollState.windowTop)) : 0
    };
  } catch {
    window.sessionStorage.removeItem(workReturnScrollKey);
    return null;
  }
}

export function consumeWorkReturnScroll(href: string) {
  const scrollState = readWorkReturnScroll(href);
  if (scrollState && typeof window !== "undefined") {
    window.sessionStorage.removeItem(workReturnScrollKey);
  }
  return scrollState;
}
