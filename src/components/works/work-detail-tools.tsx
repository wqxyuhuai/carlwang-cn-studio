"use client";

import Image from "next/image";
import type { PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

type VisibleTool = {
  icon: string;
  inverted: boolean;
  name: string;
};

const TOOL_BUBBLE_OFFSET = 18;
const TOOL_BUBBLE_RESPONSE = 0.18;
const TOOL_BUBBLE_SETTLE_THRESHOLD = 0.1;

export function WorkDetailTools({ tools }: { tools: VisibleTool[] }) {
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const isVisibleRef = useRef(false);
  const [activeName, setActiveName] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function positionBubble(x: number, y: number) {
    targetRef.current = { x, y: y + TOOL_BUBBLE_OFFSET };
  }

  function startFollowing() {
    if (rafRef.current !== null) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = () => {
      const target = targetRef.current;
      const current = currentRef.current;
      const response = reduceMotion ? 1 : TOOL_BUBBLE_RESPONSE;
      const deltaX = target.x - current.x;
      const deltaY = target.y - current.y;

      current.x += deltaX * response;
      current.y += deltaY * response;

      if (Math.abs(deltaX) < TOOL_BUBBLE_SETTLE_THRESHOLD) current.x = target.x;
      if (Math.abs(deltaY) < TOOL_BUBBLE_SETTLE_THRESHOLD) current.y = target.y;

      if (bubbleRef.current) {
        bubbleRef.current.style.setProperty("--tool-bubble-x", `${current.x}px`);
        bubbleRef.current.style.setProperty("--tool-bubble-y", `${current.y}px`);
      }

      const isSettled = current.x === target.x && current.y === target.y;
      if (isVisibleRef.current || !isSettled) {
        rafRef.current = window.requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }

  function handlePointerEnter(event: PointerEvent<HTMLLIElement>, name: string) {
    if (event.pointerType === "touch") return;
    positionBubble(event.clientX, event.clientY);
    currentRef.current = { ...targetRef.current };
    isVisibleRef.current = true;
    setActiveName(name);
    setIsVisible(true);
    startFollowing();
  }

  function handlePointerMove(event: PointerEvent<HTMLLIElement>) {
    if (event.pointerType === "touch") return;
    positionBubble(event.clientX, event.clientY);
    startFollowing();
  }

  function handlePointerLeave() {
    isVisibleRef.current = false;
    setIsVisible(false);
  }

  return (
    <div className="pw-detail-tools" aria-label="Tools">
      <div className="pw-detail-tools-title">Tools</div>
      <ul className="pw-detail-tool-list">
        {tools.map((tool) => (
          <li
            className={`pw-detail-tool${tool.inverted ? " is-dark-inverted" : ""}`}
            key={tool.name}
            onPointerEnter={(event) => handlePointerEnter(event, tool.name)}
            onPointerLeave={handlePointerLeave}
            onPointerMove={handlePointerMove}
          >
            <Image alt={tool.name} height={24} src={tool.icon} width={24} />
          </li>
        ))}
      </ul>

      <span
        aria-hidden="true"
        className={`pw-detail-tool-bubble${isVisible ? " is-visible" : ""}`}
        ref={bubbleRef}
      >
        <span className="pw-detail-tool-bubble-effect" />
        <span className="pw-detail-tool-bubble-label">{activeName}</span>
      </span>
    </div>
  );
}
