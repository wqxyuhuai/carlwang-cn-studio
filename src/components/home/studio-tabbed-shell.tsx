"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FeaturedCanvasMotionContext } from "@/components/home/featured-work-canvas";
import { GradualBlur } from "@/components/home/gradual-blur";
import { LiquidGlassFilter, useLiquidGlassSurface as useBottomNavGlassSurface } from "@/components/liquid-glass-surface";
import { lastWorksHrefKey, normalizeWorksHref, rememberLastWorksHref, replaceCurrentHistoryHref } from "@/lib/work-detail-return";

type MainTab = "works" | "about";
type WorkTab = "featured" | "list";
const bottomBlurBlockSize = "clamp(5.5rem, 14vh, 9rem)";
const useLocationLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function tabsFromHash(): { mainTab: MainTab; workTab: WorkTab } {
  if (typeof window === "undefined") return { mainTab: "works", workTab: "featured" };

  if (window.location.hash.startsWith("#works-index") || window.location.hash.startsWith("#works-list")) {
    return { mainTab: "works", workTab: "list" };
  }

  switch (window.location.hash) {
    case "#about":
      return { mainTab: "about", workTab: "featured" };
    default:
      return { mainTab: "works", workTab: "featured" };
  }
}

function syncDocumentWorkTab(workTab: WorkTab) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.workTab = workTab;
}

function normalizedCurrentHref() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function isWorksHref(href: string) {
  return href.endsWith("#works") || href.includes("#works-index") || href.includes("#works-list");
}

function rememberWorksHref(href = normalizedCurrentHref()) {
  if (!isWorksHref(href)) return;
  rememberLastWorksHref(normalizeWorksHref(href));
}

function lastIndexHref() {
  const remembered = window.sessionStorage.getItem(lastWorksHrefKey);
  if (remembered?.includes("#works-index")) return normalizeWorksHref(remembered);
  return "/?view=grid#works-index";
}

function lastWorksHref() {
  const remembered = window.sessionStorage.getItem(lastWorksHrefKey);
  if (remembered && isWorksHref(remembered)) return normalizeWorksHref(remembered);
  return "/#works";
}

function titleFromCurrentView(mainTab: MainTab) {
  const isHomeLanding = window.location.pathname === "/" && !window.location.search && (!window.location.hash || window.location.hash === "#works");
  if (isHomeLanding) return "Studio | Carl Wang";
  return `${mainTab === "about" ? "About" : "Works"} | Carl Wang Studio`;
}

export function StudioTabbedShell({
  about,
  contactHref,
  featured,
  list
}: {
  about: ReactNode;
  contactHref: string;
  featured: ReactNode;
  list: ReactNode;
}) {
  const [tabs, setTabs] = useState<{ mainTab: MainTab; workTab: WorkTab }>({ mainTab: "works", workTab: "featured" });
  const [isLocationSynced, setIsLocationSynced] = useState(false);
  const [isAutoFlightEnabled, setIsAutoFlightEnabled] = useState(true);
  const [isLogoShaking, setIsLogoShaking] = useState(false);
  const [viewTitle, setViewTitle] = useState("Studio | Carl Wang");
  const { mainTab, workTab } = tabs;
  const workTabsRef = useRef<HTMLDivElement>(null);
  const bottomNavRef = useRef<HTMLElement>(null);
  const autoFlightButtonRef = useRef<HTMLButtonElement>(null);
  const logoShakeTimerRef = useRef<number | null>(null);
  const workTabsGlass = useBottomNavGlassSurface(workTabsRef);
  const bottomNavGlass = useBottomNavGlassSurface(bottomNavRef);
  const autoFlightButtonGlass = useBottomNavGlassSurface(autoFlightButtonRef);
  const featuredCanvasMotion = useMemo(
    () => ({ autoFlightEnabled: isAutoFlightEnabled, featuredActive: isLocationSynced && mainTab === "works" && workTab === "featured" }),
    [isAutoFlightEnabled, isLocationSynced, mainTab, workTab]
  );

  useLocationLayoutEffect(() => {
    function syncTabsFromHash() {
      const currentHref = normalizedCurrentHref();
      const normalizedHref = normalizeWorksHref(currentHref);
      if (normalizedHref !== currentHref) {
        replaceCurrentHistoryHref(normalizedHref);
      }
      const nextTabs = tabsFromHash();
      setTabs(nextTabs);
      syncDocumentWorkTab(nextTabs.workTab);
      if (window.location.hash === "#works-list") {
        replaceCurrentHistoryHref(`${window.location.pathname}${window.location.search}#works-index`);
      }
      if (isWorksHref(normalizedCurrentHref())) {
        rememberWorksHref();
      }
    }

    syncTabsFromHash();
    let settledFrame: number | null = null;
    const firstFrame = window.requestAnimationFrame(() => {
      settledFrame = window.requestAnimationFrame(() => setIsLocationSynced(true));
    });
    window.addEventListener("hashchange", syncTabsFromHash);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (settledFrame !== null) window.cancelAnimationFrame(settledFrame);
      window.removeEventListener("hashchange", syncTabsFromHash);
    };
  }, []);

  useEffect(
    () => () => {
      if (logoShakeTimerRef.current !== null) {
        window.clearTimeout(logoShakeTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    function applyTitle() {
      const title = titleFromCurrentView(mainTab);
      setViewTitle(title);
      document.title = title;
      document.querySelectorAll("head title").forEach((element) => {
        element.textContent = title;
      });
    }

    applyTitle();
    const frame = window.requestAnimationFrame(applyTitle);
    const timeouts = [80, 300, 1000].map((delay) => window.setTimeout(applyTitle, delay));

    return () => {
      window.cancelAnimationFrame(frame);
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [mainTab, workTab]);

  function selectMainTab(nextTab: MainTab) {
    if (nextTab === "about") {
      rememberWorksHref();
      setTabs((current) => ({ mainTab: "about", workTab: current.workTab }));
      replaceCurrentHistoryHref("#about");
      return;
    }

    const targetHref = lastWorksHref();
    const nextWorkTab = targetHref.includes("#works-index") ? "list" : "featured";
    setTabs({ mainTab: "works", workTab: nextWorkTab });
    syncDocumentWorkTab(nextWorkTab);
    replaceCurrentHistoryHref(targetHref);
    rememberWorksHref(targetHref);
    window.dispatchEvent(new CustomEvent("cw:works-browser-sync"));
  }

  function selectWorkTab(nextTab: WorkTab) {
    const targetHref = nextTab === "list" ? lastIndexHref() : "/#works";
    setTabs({ mainTab: "works", workTab: nextTab });
    syncDocumentWorkTab(nextTab);
    replaceCurrentHistoryHref(targetHref);
    rememberWorksHref(targetHref);
    window.dispatchEvent(new CustomEvent("cw:works-browser-sync"));
  }

  function triggerLogoShake() {
    if (logoShakeTimerRef.current !== null) {
      window.clearTimeout(logoShakeTimerRef.current);
    }

    setIsLogoShaking(false);
    window.requestAnimationFrame(() => {
      setIsLogoShaking(true);
      logoShakeTimerRef.current = window.setTimeout(() => setIsLogoShaking(false), 520);
    });
  }

  return (
    <>
    <title>{viewTitle}</title>
    <main className={`cw-studio-shell${isLocationSynced ? "" : " is-location-syncing"}`}>
      {mainTab === "works" ? (
        <div className="cw-work-top-mask" aria-hidden="true" />
      ) : null}

      {mainTab === "works" ? (
        <div
          className={`cw-work-tabs ${workTabsGlass.supportsSvgFilter ? "cw-work-tabs--svg" : "cw-work-tabs--fallback"}`}
          role="tablist"
          aria-label="Works view"
          data-work-tab={workTab}
          ref={workTabsRef}
          style={workTabsGlass.style}
        >
          <svg
            className="cw-glass-filter"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ blockSize: "100%", height: "100%", inset: 0, inlineSize: "100%", opacity: 0, pointerEvents: "none", position: "absolute", width: "100%", zIndex: -1 }}
          >
            <defs>
              <filter id={workTabsGlass.filterId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
                <feImage
                  href={workTabsGlass.displacementMap || undefined}
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  preserveAspectRatio="none"
                  result="map"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="map"
                  result="dispRed"
                  scale="-180"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
                <feColorMatrix
                  in="dispRed"
                  type="matrix"
                  values="1 0 0 0 0
                          0 0 0 0 0
                          0 0 0 0 0
                          0 0 0 1 0"
                  result="red"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="map"
                  result="dispGreen"
                  scale="-170"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
                <feColorMatrix
                  in="dispGreen"
                  type="matrix"
                  values="0 0 0 0 0
                          0 1 0 0 0
                          0 0 0 0 0
                          0 0 0 1 0"
                  result="green"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="map"
                  result="dispBlue"
                  scale="-160"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
                <feColorMatrix
                  in="dispBlue"
                  type="matrix"
                  values="0 0 0 0 0
                          0 0 0 0 0
                          0 0 1 0 0
                          0 0 0 1 0"
                  result="blue"
                />
                <feBlend in="red" in2="green" mode="screen" result="rg" />
                <feBlend in="rg" in2="blue" mode="screen" result="output" />
                <feGaussianBlur in="output" stdDeviation="0" />
              </filter>
            </defs>
          </svg>
          <button
            aria-controls="cw-featured-panel"
            aria-selected={workTab === "featured"}
            className={workTab === "featured" ? "is-active" : undefined}
            id="cw-featured-tab"
            onClick={() => selectWorkTab("featured")}
            role="tab"
            type="button"
          >
            <span className="cw-nav-text-mask">
              <span className="cw-nav-text-track">
                <span className="cw-nav-text-line">Featured</span>
                <span className="cw-nav-text-line" aria-hidden="true">Featured</span>
              </span>
            </span>
          </button>
          <button
            aria-controls="cw-list-panel"
            aria-selected={workTab === "list"}
            className={workTab === "list" ? "is-active" : undefined}
            id="cw-list-tab"
            onClick={() => selectWorkTab("list")}
            role="tab"
            type="button"
          >
            <span className="cw-nav-text-mask">
              <span className="cw-nav-text-track">
                <span className="cw-nav-text-line">Index</span>
                <span className="cw-nav-text-line" aria-hidden="true">Index</span>
              </span>
            </span>
          </button>
        </div>
      ) : null}

      <section
        className={`cw-tab-panel cw-tab-panel--works ${mainTab === "works" ? "is-active" : ""}`}
        hidden={mainTab !== "works"}
      >
        <div
          aria-hidden={workTab !== "featured"}
          aria-labelledby="cw-featured-tab"
          className={`cw-work-view cw-work-view--featured ${workTab === "featured" ? "is-active" : ""}`}
          id="cw-featured-panel"
          role="tabpanel"
        >
          {mainTab === "works" ? (
            <FeaturedCanvasMotionContext.Provider value={featuredCanvasMotion}>
              {featured}
            </FeaturedCanvasMotionContext.Provider>
          ) : null}
        </div>
        <div
          aria-hidden={workTab !== "list"}
          aria-labelledby="cw-list-tab"
          className={`cw-work-view cw-work-view--list ${workTab === "list" ? "is-active" : ""}`}
          id="cw-list-panel"
          role="tabpanel"
        >
          {list}
        </div>
      </section>

      <section
        aria-labelledby="cw-about-tab"
        className={`cw-tab-panel cw-tab-panel--about ${mainTab === "about" ? "is-active" : ""}`}
        hidden={mainTab !== "about"}
        id="cw-about-panel"
        role="tabpanel"
      >
        {about}
      </section>

      <div className="cw-bottom-blur" aria-hidden="true" style={{ blockSize: bottomBlurBlockSize }}>
        <GradualBlur
          curve="ease-in"
          divCount={8}
          exponential={false}
          heightRem={9}
          opacity={1}
          position="bottom"
          strength={2}
          zIndex={1}
        />
      </div>

      <nav
        className={`cw-bottom-tabs ${bottomNavGlass.supportsSvgFilter ? "cw-bottom-tabs--svg" : "cw-bottom-tabs--fallback"}`}
        aria-label="Primary sections"
        ref={bottomNavRef}
        style={bottomNavGlass.style}
      >
        <svg
          className="cw-glass-filter"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ blockSize: "100%", height: "100%", inset: 0, inlineSize: "100%", opacity: 0, pointerEvents: "none", position: "absolute", width: "100%", zIndex: -1 }}
        >
          <defs>
            <filter id={bottomNavGlass.filterId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
              <feImage
                href={bottomNavGlass.displacementMap || undefined}
                x="0"
                y="0"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                result="map"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                result="dispRed"
                scale="-180"
                xChannelSelector="R"
                yChannelSelector="G"
              />
              <feColorMatrix
                in="dispRed"
                type="matrix"
                values="1 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0"
                result="red"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                result="dispGreen"
                scale="-170"
                xChannelSelector="R"
                yChannelSelector="G"
              />
              <feColorMatrix
                in="dispGreen"
                type="matrix"
                values="0 0 0 0 0
                        0 1 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0"
                result="green"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                result="dispBlue"
                scale="-160"
                xChannelSelector="R"
                yChannelSelector="G"
              />
              <feColorMatrix
                in="dispBlue"
                type="matrix"
                values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 1 0 0
                        0 0 0 1 0"
                result="blue"
              />
              <feBlend in="red" in2="green" mode="screen" result="rg" />
              <feBlend in="rg" in2="blue" mode="screen" result="output" />
              <feGaussianBlur in="output" stdDeviation="0" />
            </filter>
          </defs>
        </svg>
        <button
          className={`cw-bottom-logo ${isLogoShaking ? "is-shaking" : ""}`}
          aria-label="Carl Wang Studio logo"
          onClick={triggerLogoShake}
          type="button"
        >
          <span aria-hidden="true" />
        </button>
        <div className="cw-bottom-tab-group" role="tablist" aria-label="Primary views">
          <button
            aria-controls="cw-featured-panel"
            aria-selected={mainTab === "works"}
            className={mainTab === "works" ? "is-active" : undefined}
            onClick={() => selectMainTab("works")}
            role="tab"
            type="button"
          >
            <span className="cw-nav-text-mask">
              <span className="cw-nav-text-track">
                <span className="cw-nav-text-line">Works</span>
                <span className="cw-nav-text-line" aria-hidden="true">Works</span>
              </span>
            </span>
          </button>
          <button
            aria-controls="cw-about-panel"
            aria-selected={mainTab === "about"}
            className={mainTab === "about" ? "is-active" : undefined}
            id="cw-about-tab"
            onClick={() => selectMainTab("about")}
            role="tab"
            type="button"
          >
            <span className="cw-nav-text-mask">
              <span className="cw-nav-text-track">
                <span className="cw-nav-text-line">About</span>
                <span className="cw-nav-text-line" aria-hidden="true">About</span>
              </span>
            </span>
          </button>
        </div>
        <a className="cw-bottom-contact" href={contactHref}>
          <span className="cw-bottom-contact-label cw-nav-text-mask">
            <span className="cw-nav-text-track">
              <span className="cw-nav-text-line">Contact</span>
              <span className="cw-nav-text-line" aria-hidden="true">Contact</span>
            </span>
          </span>
          <span className="cw-bottom-contact-arrow" aria-hidden="true">
            <span className="cw-nav-arrow-mask">
              <span className="cw-nav-arrow-icon cw-nav-arrow-icon-current">&#8599;</span>
              <span className="cw-nav-arrow-icon cw-nav-arrow-icon-next">&#8599;</span>
            </span>
          </span>
        </a>
      </nav>

      {mainTab === "works" && workTab === "featured" ? (
        <button
          aria-label={isAutoFlightEnabled ? "Pause featured canvas auto flight" : "Play featured canvas auto flight"}
          aria-pressed={isAutoFlightEnabled}
          className={`cw-featured-autoflight-toggle ${
            autoFlightButtonGlass.supportsSvgFilter
              ? "cw-bottom-glass-surface--svg"
              : "cw-bottom-glass-surface--fallback"
          }`}
          onClick={() => setIsAutoFlightEnabled((current) => !current)}
          ref={autoFlightButtonRef}
          style={autoFlightButtonGlass.style}
          title={isAutoFlightEnabled ? "Pause auto flight" : "Play auto flight"}
          type="button"
        >
          <LiquidGlassFilter surface={autoFlightButtonGlass} />
          <span className="cw-featured-autoflight-glyph" aria-hidden="true">
            {isAutoFlightEnabled ? (
              <span className="cw-featured-autoflight-pause" />
            ) : (
              <svg className="cw-featured-autoflight-play" viewBox="0 0 16 16" focusable="false">
                <path
                  d="M3.9 2.42C3.9 1.48 4.92 0.89 5.72 1.37L13.24 5.88C14.02 6.35 14.02 7.48 13.24 7.95L5.72 12.46C4.92 12.94 3.9 12.35 3.9 11.41V2.42Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </span>
        </button>
      ) : null}
    </main>
    </>
  );
}
