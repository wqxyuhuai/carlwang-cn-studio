"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function HomeMotionLayer() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reduceMotion.matches) {
      return;
    }

    const hero = document.querySelector<HTMLElement>("[data-home-hero]");
    const heroVisual = document.querySelector<HTMLElement>("[data-home-hero-visual]");
    const heroTitle = document.querySelector<HTMLElement>("[data-home-title]");
    const heroMeta = document.querySelector<HTMLElement>("[data-home-meta]");
    const strip = document.querySelector<HTMLElement>("[data-home-second]");
    const workStage = document.querySelector<HTMLElement>("[data-home-work-stage]");
    const thumbTrack = document.querySelector<HTMLElement>("[data-home-thumb-track]");

    if (!hero || !heroVisual || !heroTitle || !heroMeta) {
      return;
    }

    const media = gsap.matchMedia();
    const ctx = gsap.context(() => {
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
          .fromTo(strip, { autoAlpha: 1, y: 120 }, { autoAlpha: 1, duration: 0.9, ease: "none", y: 0 }, 0.08);

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
    };
  }, []);

  return null;
}
