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

    const strip = document.querySelector<HTMLElement>("[data-home-second]");
    const workStage = document.querySelector<HTMLElement>("[data-home-work-stage]");
    const thumbTrack = document.querySelector<HTMLElement>("[data-home-thumb-track]");

    if (!strip || !workStage || !thumbTrack) {
      return;
    }

    const media = gsap.matchMedia();
    const ctx = gsap.context(() => {
      media.add("(min-width: 901px)", () => {
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
          workTl.kill();
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
