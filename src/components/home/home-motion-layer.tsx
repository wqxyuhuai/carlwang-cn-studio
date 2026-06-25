"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function HomeMotionLayer() {
  const rootRef = useRef<HTMLDivElement>(null);

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
    const slices = gsap.utils.toArray<HTMLElement>(".pw-home-raster-slice");

    if (!hero || !heroVisual || !heroTitle || !heroMeta || !overlay || !square || !ripples) {
      return;
    }

    document.documentElement.classList.add("is-home-intro-running");

    const media = gsap.matchMedia();
    const ctx = gsap.context(() => {
      gsap.set([heroTitle, heroMeta], { autoAlpha: 0, y: 20 });
      gsap.set(heroVisual, {
        autoAlpha: 0,
        scale: 1.03,
        y: 20
      });
      gsap.set(slices, { autoAlpha: 0, scaleY: 0.94, transformOrigin: "50% 100%", yPercent: 10 });

      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          gsap.set(overlay, { display: "none" });
          document.documentElement.classList.remove("is-home-intro-running");
          document.documentElement.classList.add("is-home-intro-complete");
        }
      });

      intro
        .fromTo(square, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, duration: 0.28, scale: 1 })
        .to(square, { duration: 0.66 })
        .to(square, { autoAlpha: 0, duration: 0.38, scale: 1.08 }, "+=0.04")
        .to(overlay, { "--intro-ripple-radius": "145%", duration: 0.9, ease: "power2.inOut" }, "<0.02")
        .fromTo(
          heroVisual,
          { autoAlpha: 0, scale: 1.03, y: 20 },
          { autoAlpha: 1, duration: 0.9, force3D: true, scale: 1, y: 0 },
          "<"
        )
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
            scrub: true,
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
            { autoAlpha: 1, scale: 1, yPercent: 0 },
            { autoAlpha: 0.08, duration: 1, ease: "none", force3D: true, immediateRender: false, scale: 1.06, yPercent: -35 },
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
              scrub: true,
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

  return (
    <div className="home-motion-layer" ref={rootRef}>
      <div className="home-intro-overlay" aria-hidden="true">
        <span className="home-intro-ripples" />
        <span className="home-intro-square" />
      </div>
    </div>
  );
}
