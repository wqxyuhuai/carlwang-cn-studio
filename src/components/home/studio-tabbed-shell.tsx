"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { GradualBlur } from "@/components/home/gradual-blur";

type MainTab = "works" | "about";
type WorkTab = "featured" | "list";

function useBottomNavGlassSurface(navRef: RefObject<HTMLElement | null>) {
  const reactId = useId();
  const stableId = useMemo(() => reactId.replace(/[^a-zA-Z0-9_-]/g, ""), [reactId]);
  const filterId = `cw-bottom-glass-filter-${stableId}`;
  const redGradId = `cw-bottom-glass-red-${stableId}`;
  const blueGradId = `cw-bottom-glass-blue-${stableId}`;
  const [displacementMap, setDisplacementMap] = useState("");
  const [supportsSvgFilter, setSupportsSvgFilter] = useState(false);

  const generateDisplacementMap = useCallback(() => {
    const rect = navRef.current?.getBoundingClientRect();
    const styles = navRef.current ? window.getComputedStyle(navRef.current) : null;
    const actualWidth = Math.max(1, Math.round(rect?.width || 380));
    const actualHeight = Math.max(1, Math.round(rect?.height || 56));
    const radius = styles ? Number.parseFloat(styles.borderTopLeftRadius) || 12 : 12;
    const edgeSize = Math.min(actualWidth, actualHeight) * 0.035;

    const svgContent = `
      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${radius}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${radius}" fill="url(#${blueGradId})" style="mix-blend-mode: difference" />
        <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${
          actualHeight - edgeSize * 2
        }" rx="${radius}" fill="hsl(0 0% 50% / 0.93)" style="filter: blur(11px)" />
      </svg>
    `;

    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  }, [blueGradId, navRef, redGradId]);

  const updateDisplacementMap = useCallback(() => {
    setDisplacementMap(generateDisplacementMap());
  }, [generateDisplacementMap]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    const frame = window.requestAnimationFrame(() => {
      const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      const isFirefox = /Firefox/.test(navigator.userAgent);
      const supportsUrlFilter =
        Boolean(window.CSS?.supports("backdrop-filter", `url(#${filterId})`)) ||
        Boolean(window.CSS?.supports("-webkit-backdrop-filter", `url(#${filterId})`));

      setSupportsSvgFilter(!isWebkit && !isFirefox && supportsUrlFilter);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [filterId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const element = navRef.current;
    let frame = window.requestAnimationFrame(updateDisplacementMap);

    if (!element || typeof ResizeObserver === "undefined") {
      return () => window.cancelAnimationFrame(frame);
    }

    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateDisplacementMap);
    });

    resizeObserver.observe(element);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [navRef, updateDisplacementMap]);

  const style = useMemo(
    () =>
      ({
        "--cw-bottom-glass-filter": `url(#${filterId})`
      }) as CSSProperties,
    [filterId]
  );

  return {
    blueGradId,
    displacementMap,
    filterId,
    redGradId,
    style,
    supportsSvgFilter
  };
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
  const { mainTab, workTab } = tabs;
  const workTabsRef = useRef<HTMLDivElement>(null);
  const bottomNavRef = useRef<HTMLElement>(null);
  const workTabsGlass = useBottomNavGlassSurface(workTabsRef);
  const bottomNavGlass = useBottomNavGlassSurface(bottomNavRef);

  function selectMainTab(nextTab: MainTab) {
    setTabs((current) => ({ mainTab: nextTab, workTab: current.workTab }));
    window.history.replaceState(null, "", nextTab === "about" ? "#about" : "#works");
  }

  function selectWorkTab(nextTab: WorkTab) {
    setTabs({ mainTab: "works", workTab: nextTab });
    window.history.replaceState(null, "", nextTab === "list" ? "#works-list" : "#works");
  }

  return (
    <main className="cw-studio-shell">
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
            Featured
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
            List
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
          {featured}
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

      <div className="cw-bottom-blur" aria-hidden="true">
        <GradualBlur
          curve="ease-in"
          divCount={30}
          exponential={false}
          heightRem={10}
          opacity={1}
          position="bottom"
          strength={4.6}
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
        <button className="cw-bottom-logo" aria-label="Carl Wang Studio home" onClick={() => selectMainTab("works")} type="button">
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
    </main>
  );
}
