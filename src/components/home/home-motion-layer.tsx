"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const interactiveSelector = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[data-cursor-hover]"
].join(",");

export function HomeMotionLayer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!root || reduceMotion.matches) {
      return;
    }

    const hero = document.querySelector<HTMLElement>("[data-home-hero]");
    const heroVisual = document.querySelector<HTMLElement>("[data-home-hero-visual]");
    const heroTitle = document.querySelector<HTMLElement>("[data-home-title]");
    const heroMeta = document.querySelector<HTMLElement>("[data-home-meta]");
    const strip = document.querySelector<HTMLElement>("[data-home-second]");
    const workStage = document.querySelector<HTMLElement>("[data-home-work-stage]");
    const thumbTrack = document.querySelector<HTMLElement>("[data-home-thumb-track]");
    const overlay = root.querySelector<HTMLElement>(".home-intro-overlay");
    const square = root.querySelector<HTMLElement>(".home-intro-square");
    const ripples = root.querySelector<HTMLElement>(".home-intro-ripples");
    const displacement = displacementRef.current;
    const slices = gsap.utils.toArray<HTMLElement>(".pw-home-raster-slice");

    if (!hero || !heroVisual || !heroTitle || !heroMeta || !overlay || !square || !ripples || !displacement) {
      return;
    }

    document.documentElement.classList.add("is-home-intro-running");

    const media = gsap.matchMedia();
    const ctx = gsap.context(() => {
      gsap.set([heroTitle, heroMeta], { autoAlpha: 0, y: 20 });
      gsap.set(heroVisual, {
        autoAlpha: 0,
        filter: "url(#home-ripple-displacement) blur(10px)",
        scale: 1.03,
        y: 20
      });
      gsap.set(slices, { autoAlpha: 0, scaleY: 0.94, transformOrigin: "50% 100%", yPercent: 10 });
      gsap.set(displacement, { attr: { scale: 7 } });

      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          gsap.set(overlay, { display: "none" });
          gsap.set(heroVisual, { clearProps: "filter" });
          document.documentElement.classList.remove("is-home-intro-running");
          document.documentElement.classList.add("is-home-intro-complete");
        }
      });

      intro
        .fromTo(square, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, duration: 0.28, scale: 1 })
        .to(square, { duration: 0.66 })
        .to(square, { autoAlpha: 0, duration: 0.38, filter: "blur(6px)", scale: 1.08 }, "+=0.04")
        .to(overlay, { "--intro-ripple-radius": "145%", duration: 0.9, ease: "power2.inOut" }, "<0.02")
        .fromTo(
          heroVisual,
          { autoAlpha: 0, filter: "url(#home-ripple-displacement) blur(10px)", scale: 1.03, y: 20 },
          { autoAlpha: 1, duration: 0.9, filter: "url(#home-ripple-displacement) blur(0px)", scale: 1, y: 0 },
          "<"
        )
        .to(displacement, { attr: { scale: 0 }, duration: 0.9, ease: "power2.out" }, "<")
        .to(ripples, { autoAlpha: 0.55, duration: 0.26 }, "<0.08")
        .to(
          slices,
          {
            autoAlpha: 0.22,
            duration: 0.58,
            ease: "power2.out",
            scaleY: 1,
            stagger: 0.045,
            yPercent: 0
          },
          "<0.06"
        )
        .to([heroTitle, heroMeta], { autoAlpha: 1, duration: 0.68, stagger: 0.08, y: 0 }, "<0.2")
        .to(ripples, { autoAlpha: 0, duration: 0.42 }, ">-0.36");

      media.add("(min-width: 901px)", () => {
        if (!strip) {
          return undefined;
        }

        const scrollTl = gsap.timeline({
          scrollTrigger: {
            anticipatePin: 1,
            end: "+=120%",
            invalidateOnRefresh: true,
            pin: true,
            pinSpacing: false,
            scrub: 0.8,
            start: "top top",
            trigger: hero
          }
        });

        scrollTl
          .fromTo(
            hero,
            { "--hero-cut-y": "0%", "--hero-scroll-wave": 0 },
            { "--hero-cut-y": "112%", "--hero-scroll-wave": 0.38, ease: "none", immediateRender: false },
            0
          )
          .fromTo(
            heroVisual,
            { autoAlpha: 1, filter: "blur(0px)", scale: 1, yPercent: 0 },
            { autoAlpha: 0.08, duration: 1, ease: "none", filter: "blur(8px)", immediateRender: false, scale: 1.06, yPercent: -35 },
            0
          )
          .fromTo(
            [heroTitle, heroMeta],
            { autoAlpha: 1, y: 0 },
            { autoAlpha: 0, duration: 0.82, ease: "none", immediateRender: false, y: -80 },
            0
          )
          .fromTo(strip, { autoAlpha: 0.18, y: 120 }, { autoAlpha: 1, duration: 0.9, ease: "none", y: 0 }, 0.08);

        if (workStage && thumbTrack) {
          const getTrackTravel = () => Math.max(0, thumbTrack.scrollWidth - workStage.clientWidth);
          const workTl = gsap.timeline({
            scrollTrigger: {
              end: "bottom top",
              invalidateOnRefresh: true,
              scrub: 0.75,
              start: "top bottom",
              trigger: strip
            }
          });

          workTl.fromTo(
            thumbTrack,
            { x: 0 },
            { ease: "none", immediateRender: false, x: () => getTrackTravel() * -1 },
            0
          );

          return () => {
            scrollTl.kill();
            workTl.kill();
          };
        }

        return () => {
          scrollTl.kill();
        };
      });
    }, document.body);

    return () => {
      media.revert();
      ctx.revert();
      document.documentElement.classList.remove("is-home-intro-running", "is-home-intro-complete");
    };
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

    if (!cursor || reduceMotion.matches || !finePointer.matches) {
      return;
    }

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let frame = 0;

    const setHoverState = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      document.body.classList.toggle("is-cursor-hovering", Boolean(element?.closest(interactiveSelector)));
    };

    const handlePointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      document.body.classList.add("is-cursor-visible");
      setHoverState(event.target);
    };

    const animateCursor = () => {
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;
      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      frame = window.requestAnimationFrame(animateCursor);
    };

    document.documentElement.classList.add("has-home-custom-cursor");
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    frame = window.requestAnimationFrame(animateCursor);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.classList.remove("has-home-custom-cursor");
      document.body.classList.remove("is-cursor-hovering", "is-cursor-visible");
    };
  }, []);

  return (
    <div className="home-motion-layer" ref={rootRef}>
      <svg aria-hidden="true" className="home-motion-defs" focusable="false">
        <filter id="home-ripple-displacement">
          <feTurbulence baseFrequency="0.012 0.018" numOctaves="2" result="noise" seed="7" type="fractalNoise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" ref={displacementRef} scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="home-intro-overlay" aria-hidden="true">
        <span className="home-intro-ripples" />
        <span className="home-intro-square" />
      </div>

      <span className="custom-cursor" ref={cursorRef} aria-hidden="true" />
    </div>
  );
}
