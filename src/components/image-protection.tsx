"use client";

import { useEffect } from "react";

function eventTargetsImage(event: Event) {
  const target = event.target;
  return target instanceof Element && Boolean(target.closest("img"));
}

function selectionContainsImage() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  for (let index = 0; index < selection.rangeCount; index += 1) {
    const fragment = selection.getRangeAt(index).cloneContents();
    if (fragment.querySelector("img")) return true;
  }

  return false;
}

export function ImageProtection() {
  useEffect(() => {
    const blockImageEvent = (event: Event) => {
      if (!eventTargetsImage(event)) return;
      event.preventDefault();
    };

    const blockImageCopy = (event: ClipboardEvent) => {
      if (!eventTargetsImage(event) && !selectionContainsImage()) return;
      event.preventDefault();
    };

    document.addEventListener("contextmenu", blockImageEvent, { capture: true });
    document.addEventListener("dragstart", blockImageEvent, { capture: true });
    document.addEventListener("copy", blockImageCopy, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", blockImageEvent, { capture: true });
      document.removeEventListener("dragstart", blockImageEvent, { capture: true });
      document.removeEventListener("copy", blockImageCopy, { capture: true });
    };
  }, []);

  return null;
}
