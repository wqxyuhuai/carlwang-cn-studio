"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import type { Work } from "@/lib/types";
import { currentWorkSurfaceHref, rememberWorkNavigation, workDetailHrefWithReturn } from "@/lib/work-detail-return";

type CanvasImage = {
  src: string;
  alt: string;
  title: string;
  href: string;
};

type InfinitePlaneData = {
  id: string;
  position: [number, number, number];
  size: number;
  rotation: number;
  mediaIndex: number;
  chunk: [number, number, number];
};

type InfiniteCameraGridState = {
  cx: number;
  cy: number;
  cz: number;
  camZ: number;
};

type FeaturedCanvasClientSettings = {
  compact: boolean;
  mobile: boolean;
  playEntry: boolean;
};

const fallbackImages: CanvasImage[] = [
  { src: "/field-media/a1-2.webp", alt: "Selected work preview", title: "Selected Work", href: "/works" },
  { src: "/figma/pw2-work-image.png", alt: "Selected work preview", title: "Selected Work", href: "/works" },
  { src: "/field-media/a2-1.webp", alt: "Selected work preview", title: "Selected Work", href: "/works" },
  { src: "/field-media/a1-1.webp", alt: "Selected work preview", title: "Selected Work", href: "/works" },
  { src: "/field-media/b1-1.webp", alt: "Selected work preview", title: "Selected Work", href: "/works" },
  { src: "/field-media/c1-5.webp", alt: "Selected work preview", title: "Selected Work", href: "/works" }
];

const INFINITE_CHUNK_SIZE = 68;
const INFINITE_RENDER_DISTANCE = 1;
const INFINITE_ENTRY_CAMERA_Z = 96;
const INFINITE_COMPACT_ENTRY_CAMERA_Z = 78;
const INFINITE_INITIAL_CAMERA_Z = 52;
const INFINITE_COMPACT_INITIAL_CAMERA_Z = 58;
const INFINITE_MAX_VELOCITY = 4.4;
const INFINITE_VELOCITY_DECAY = 0.89;
const INFINITE_WHEEL_BOOST = 0.013;
const INFINITE_ENTRY_SECONDS = 1.8;
const INFINITE_ENTRY_BOOST = 0.085;
const INFINITE_AUTO_FLIGHT_BOOST = 0.0065;
const INFINITE_COMPACT_ENTRY_BOOST = 0.08;
const INFINITE_COMPACT_AUTO_FLIGHT_BOOST = 0.018;
const INFINITE_PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1);
const INFINITE_MOBILE_TEXTURE_LIMIT = 8;
const INFINITE_DESKTOP_TEXTURE_LIMIT = 10;
const INFINITE_RADIUS_MASK_SIZE = 128;
const INFINITE_RADIUS_NOMINAL_CARD_SIZE = 192;

export const FeaturedCanvasMotionContext = createContext({ autoFlightEnabled: true, featuredActive: true });
const featuredEntryPlayedKey = "cw-featured-entry-played";
const featuredPrefetchedHrefs = new Set<string>();

function useFeaturedCanvasClientSettings() {
  const [settings, setSettings] = useState<FeaturedCanvasClientSettings | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 760px), (pointer: coarse)");
    const mobileMediaQuery = window.matchMedia("(max-width: 760px)");
    const updateCompactMode = () => {
      setSettings((current) => ({
        compact: mediaQuery.matches,
        mobile: mobileMediaQuery.matches,
        playEntry: current?.playEntry ?? shouldPlayFeaturedEntry()
      }));
    };
    updateCompactMode();
    mediaQuery.addEventListener("change", updateCompactMode);
    mobileMediaQuery.addEventListener("change", updateCompactMode);

    return () => {
      mediaQuery.removeEventListener("change", updateCompactMode);
      mobileMediaQuery.removeEventListener("change", updateCompactMode);
    };
  }, []);

  return settings;
}

const INFINITE_CHUNK_OFFSETS: Array<[number, number, number]> = [
  [0, 0, 0],
  [0, 0, -1],
  [0, 0, 1],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [1, 1, 0],
  [1, -1, 0],
  [-1, 1, 0],
  [-1, -1, 0],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, -1],
  [0, -1, -1]
];

const INFINITE_COMPACT_CHUNK_OFFSETS: Array<[number, number, number]> = [
  [0, 0, 0],
  [0, 0, -1],
  [0, 0, 1],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0]
];

const INFINITE_MOBILE_CHUNK_OFFSETS: Array<[number, number, number]> = [
  [0, 0, 0],
  [0, 0, -1],
  [0, 0, 1]
];

function shouldPlayFeaturedEntry() {
  if (typeof window === "undefined") return true;
  return window.sessionStorage.getItem(featuredEntryPlayedKey) !== "1";
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function readCssLengthInPixels(propertyName: string, fallback: number) {
  if (typeof window === "undefined") return fallback;

  const rawValue = window.getComputedStyle(document.documentElement).getPropertyValue(propertyName).trim();
  const numericValue = Number.parseFloat(rawValue);
  if (!Number.isFinite(numericValue)) return fallback;

  if (rawValue.endsWith("rem")) {
    const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
    return numericValue * (Number.isFinite(rootFontSize) ? rootFontSize : 16);
  }

  return numericValue;
}

function createRoundedAlphaMask(radiusPixels: number) {
  const size = INFINITE_RADIUS_MASK_SIZE;
  const radius = clampNumber((radiusPixels / INFINITE_RADIUS_NOMINAL_CARD_SIZE) * size, 1, size / 4);
  const half = size / 2;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offsetX = Math.max(Math.abs(x + 0.5 - half) - (half - radius), 0);
      const offsetY = Math.max(Math.abs(y + 0.5 - half) - (half - radius), 0);
      const distance = Math.hypot(offsetX, offsetY) - radius;
      const alpha = Math.round(clampNumber(0.5 - distance, 0, 1) * 255);
      const index = (y * size + x) * 4;

      data[index] = alpha;
      data[index + 1] = alpha;
      data[index + 2] = alpha;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function seededUnit(seed: number) {
  const value = Math.sin(seed * 9999) * 10000;
  return value - Math.floor(value);
}

function hashKey(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function generateInfiniteChunkPlanes(cx: number, cy: number, cz: number, mediaCount: number, compact: boolean): InfinitePlaneData[] {
  const seed = hashKey(`${cx},${cy},${cz}`);
  const isCenterChunk = cx === 0 && cy === 0;
  const count = compact ? 4 : 6;
  const safeMediaCount = Math.max(mediaCount, 1);

  return Array.from({ length: count }, (_, index) => {
    const base = seed + index * 997;
    const random = (offset: number) => seededUnit(base + offset);
    const centerFiller = isCenterChunk && index < 4;
    const edgeSweep = !compact && index === count - 1 && random(8) > 0.56;
    const size = centerFiller
      ? (compact ? 3.2 : 2.6) + random(4) * (compact ? 2.6 : 3.8)
      : ((compact ? 3.6 : 4.6) + random(4) * (compact ? 3 : 6.4)) * (edgeSweep ? 1.52 : 1);
    const ringAngle = random(0) * Math.PI * 2;
    const centerAngle = (index / 4) * Math.PI * 2 + (random(12) - 0.5) * 0.72;
    const centerRadius = (compact ? 6 : 12) + random(13) * (compact ? 12 : 19);
    const ringRadius = (compact ? 12 : 22) + random(1) * (compact ? 18 : 38);
    const edgeSide = random(9) > 0.5 ? 1 : -1;
    const localX = isCenterChunk
      ? centerFiller
        ? Math.cos(centerAngle) * centerRadius + (random(14) - 0.5) * 8
        : Math.cos(ringAngle) * ringRadius
      : edgeSweep
        ? edgeSide * INFINITE_CHUNK_SIZE * (0.54 + random(10) * 0.18)
        : (random(0) - 0.5) * INFINITE_CHUNK_SIZE;
    const localY = isCenterChunk
      ? centerFiller
        ? Math.sin(centerAngle) * centerRadius * 0.52 + (random(15) - 0.5) * 5
        : Math.sin(ringAngle) * ringRadius * 0.62
      : edgeSweep
        ? (random(11) - 0.5) * INFINITE_CHUNK_SIZE * 0.74
        : (random(1) - 0.5) * INFINITE_CHUNK_SIZE;

    return {
      id: `${cx}-${cy}-${cz}-${index}`,
      position: [
        cx * INFINITE_CHUNK_SIZE + localX,
        cy * INFINITE_CHUNK_SIZE + localY,
        cz * INFINITE_CHUNK_SIZE + (random(2) - 0.5) * INFINITE_CHUNK_SIZE
      ],
      size,
      rotation: 0,
      mediaIndex: Math.floor(random(5) * safeMediaCount) % safeMediaCount,
      chunk: [cx, cy, cz]
    };
  });
}

function buildInfinitePlanes(cx: number, cy: number, cz: number, mediaCount: number, compact: boolean, mobile: boolean) {
  const offsets = mobile ? INFINITE_MOBILE_CHUNK_OFFSETS : compact ? INFINITE_COMPACT_CHUNK_OFFSETS : INFINITE_CHUNK_OFFSETS;
  const planes = offsets.flatMap(([dx, dy, dz]) => generateInfiniteChunkPlanes(cx + dx, cy + dy, cz + dz, mediaCount, compact));
  if (!compact || mediaCount < 2) return planes;

  if (mobile) {
    return planes.map((plane) => ({
      ...plane,
      mediaIndex: hashKey(`${plane.id},mobile-media`) % mediaCount
    }));
  }

  const mediaOffset = hashKey(`${cx},${cy},${cz},compact`) % mediaCount;
  return planes.map((plane, index) => ({ ...plane, mediaIndex: (mediaOffset + index) % mediaCount }));
}

function InfiniteCanvasPlane({
  cameraGridRef,
  canvasImage,
  compact,
  onIntent,
  onOpen,
  plane,
  roundedMask,
  texture
}: {
  cameraGridRef: RefObject<InfiniteCameraGridState>;
  canvasImage: CanvasImage;
  compact: boolean;
  onIntent: (href: string) => void;
  onOpen: (href: string) => void;
  plane: InfinitePlaneData;
  roundedMask: THREE.Texture;
  texture: THREE.Texture;
}) {
  const { invalidate } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const opacityRef = useRef(0);
  const hoverTargetRef = useRef(0);
  const hoverProgressRef = useRef(0);
  const appliedHoverProgressRef = useRef(0);
  const image = texture.image as { width?: number; height?: number } | undefined;
  const aspect = image?.width && image?.height ? image.width / image.height : 1;
  const baseScaleX = plane.size * aspect;
  const baseScaleY = plane.size;

  useFrame(() => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    const cameraGrid = cameraGridRef.current;
    if (!mesh || !material || !cameraGrid) return;

    const chunkDistance = Math.max(
      Math.abs(plane.chunk[0] - cameraGrid.cx),
      Math.abs(plane.chunk[1] - cameraGrid.cy),
      Math.abs(plane.chunk[2] - cameraGrid.cz)
    );
    const chunkFade =
      chunkDistance <= INFINITE_RENDER_DISTANCE
        ? 1
        : 0;
    const depthDistance = Math.abs(plane.position[2] - cameraGrid.camZ);
    const forwardDepth = cameraGrid.camZ - plane.position[2];
    const fullOpacityDepth = compact ? 78 : 62;
    const depthFadeRange = compact ? 82 : 68;
    const depthFade = depthDistance < fullOpacityDepth ? 1 : clampNumber(1 - (depthDistance - fullOpacityDepth) / depthFadeRange, 0, 1);
    const nearFade = compact ? clampNumber((forwardDepth - 12) / 10, 0, 1) : 1;
    const targetOpacity = chunkFade * depthFade * depthFade * nearFade;

    opacityRef.current = targetOpacity < 0.01 && opacityRef.current < 0.01 ? 0 : THREE.MathUtils.lerp(opacityRef.current, targetOpacity, 0.18);
    hoverProgressRef.current = THREE.MathUtils.lerp(hoverProgressRef.current, hoverTargetRef.current, 0.2);

    const hoverProgress = hoverProgressRef.current;
    const hoverScale = 1 + hoverProgress * 0.055;
    const nextOpacity = THREE.MathUtils.lerp(opacityRef.current, 1, hoverProgress);
    const nextDepthWrite = nextOpacity > 0.98;
    const nextVisible = opacityRef.current > 0.012;

    if (Math.abs(material.opacity - nextOpacity) > 0.002) material.opacity = nextOpacity;
    if (material.depthWrite !== nextDepthWrite) material.depthWrite = nextDepthWrite;
    if (mesh.visible !== nextVisible) mesh.visible = nextVisible;

    if (Math.abs(appliedHoverProgressRef.current - hoverProgress) > 0.002) {
      appliedHoverProgressRef.current = hoverProgress;
      mesh.position.z = plane.position[2] + hoverProgress * 0.7;
      mesh.scale.set(baseScaleX * hoverScale, baseScaleY * hoverScale, 1);
    }

    if (Math.abs(hoverTargetRef.current - hoverProgress) > 0.002) invalidate();
  });

  return (
    <mesh
      ref={meshRef}
      geometry={INFINITE_PLANE_GEOMETRY}
      position={plane.position}
      rotation={[0, 0, plane.rotation]}
      scale={[baseScaleX, baseScaleY, 1]}
      onClick={(event) => {
        event.stopPropagation();
        if (event.delta > 6) return;
        onOpen(canvasImage.href);
      }}
      onPointerDown={() => onIntent(canvasImage.href)}
      onPointerOver={(event) => {
        event.stopPropagation();
        hoverTargetRef.current = 1;
        onIntent(canvasImage.href);
        invalidate();
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        hoverTargetRef.current = 0;
        invalidate();
      }}
      visible={false}
    >
      <meshBasicMaterial
        ref={materialRef}
        alphaMap={roundedMask}
        alphaTest={0.015}
        map={texture}
        fog={false}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function InfiniteCanvasField({
  autoFlightEnabled,
  compact,
  images,
  isActive,
  mobile,
  playEntry,
  onReady,
  onIntent,
  onOpen,
  roundedMask,
  scale,
  textures
}: {
  autoFlightEnabled: boolean;
  compact: boolean;
  images: CanvasImage[];
  isActive: boolean;
  mobile: boolean;
  playEntry: boolean;
  onReady: () => void;
  onIntent: (href: string) => void;
  onOpen: (href: string) => void;
  roundedMask: THREE.Texture;
  scale: number;
  textures: THREE.Texture[];
}) {
  const { camera, gl, invalidate } = useThree();
  const restingCameraZ = compact ? INFINITE_COMPACT_INITIAL_CAMERA_Z : INFINITE_INITIAL_CAMERA_Z;
  const initialCameraZ = playEntry ? (compact ? INFINITE_COMPACT_ENTRY_CAMERA_Z : INFINITE_ENTRY_CAMERA_Z) : restingCameraZ;
  const initialChunkZ = mobile ? Math.floor(initialCameraZ / INFINITE_CHUNK_SIZE) : 0;
  const cameraGridRef = useRef<InfiniteCameraGridState>({ cx: 0, cy: 0, cz: initialChunkZ, camZ: initialCameraZ });
  const readySentRef = useRef(false);
  const introProgressRef = useRef(playEntry ? 0 : 1);
  const controllerRef = useRef({
    velocity: { x: 0, y: 0, z: 0 },
    basePosition: { x: 0, y: 0, z: initialCameraZ },
    lastMouse: { x: 0, y: 0 },
    activePointers: new Map<number, { x: number; y: number }>(),
    lastPinchDistance: null as number | null,
    isDragging: false,
    keys: new Set<string>(),
    lastChunkKey: mobile ? `0,0,${initialChunkZ}` : ""
  });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [planes, setPlanes] = useState(() => buildInfinitePlanes(0, 0, initialChunkZ, textures.length, compact, mobile));

  useEffect(() => {
    const canvas = gl.domElement;
    const controller = controllerRef.current;

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      event.preventDefault();
      controller.isDragging = true;

      if (mobile) {
        controller.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const pointers = Array.from(controller.activePointers.values());
        controller.lastPinchDistance = pointers.length >= 2
          ? Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y)
          : null;
        invalidate();
        return;
      }

      controller.lastMouse = { x: event.clientX, y: event.clientY };
      invalidate();
    };

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (!controller.isDragging) return;

      if (mobile) {
        if (!controller.activePointers.has(event.pointerId)) return;
        controller.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const pointers = Array.from(controller.activePointers.values());

        if (pointers.length >= 2) {
          const pinchDistance = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
          if (controller.lastPinchDistance !== null) {
            controller.velocity.z -= (pinchDistance - controller.lastPinchDistance) * 0.018;
          }
          controller.lastPinchDistance = pinchDistance;
        }

        invalidate();
        return;
      }

      const zoomFactor = clampNumber(Math.abs(controller.basePosition.z) / restingCameraZ, 0.45, 1.8);
      controller.velocity.x -= (event.clientX - controller.lastMouse.x) * 0.018 * zoomFactor;
      controller.velocity.y += (event.clientY - controller.lastMouse.y) * 0.018 * zoomFactor;
      controller.lastMouse = { x: event.clientX, y: event.clientY };
      invalidate();
    };

    const stopDrag = (event: globalThis.PointerEvent) => {
      if (mobile) {
        controller.activePointers.delete(event.pointerId);
        controller.lastPinchDistance = null;
        controller.isDragging = controller.activePointers.size > 0;
        invalidate();
        return;
      }

      controller.isDragging = false;
      invalidate();
    };

    const handleWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      const wheelDelta =
        event.deltaMode === globalThis.WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * 16
          : event.deltaMode === globalThis.WheelEvent.DOM_DELTA_PAGE
            ? event.deltaY * canvas.clientHeight
            : event.deltaY;
      controller.velocity.z += wheelDelta * INFINITE_WHEEL_BOOST;
      invalidate();
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      controller.keys.add(event.key.toLowerCase());
      invalidate();
    };

    const handleKeyUp = (event: globalThis.KeyboardEvent) => {
      controller.keys.delete(event.key.toLowerCase());
      invalidate();
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    canvas.addEventListener("pointerleave", stopDrag);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
      canvas.removeEventListener("pointerleave", stopDrag);
      canvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gl, invalidate, mobile, restingCameraZ]);

  useEffect(() => {
    if (!isActive || prefersReducedMotion || (!autoFlightEnabled && !playEntry)) return;

    // Mobile uses the Canvas' native frame loop while auto flight is active.
    // Driving demand rendering from a second RAF loop can queue frames unevenly
    // on mobile Safari and show up as a regular hitch.
    if (mobile) return;

    const entryDeadline = window.performance.now() + (INFINITE_ENTRY_SECONDS + 1) * 1000;
    let animationFrame = 0;
    let previousFrameTime = 0;

    const scheduleFrame = (time: number) => {
      if (!autoFlightEnabled && time >= entryDeadline) return;

      const frameInterval = 1000 / (compact ? 30 : 45);
      if (time - previousFrameTime >= frameInterval) {
        previousFrameTime = time;
        invalidate();
      }
      animationFrame = window.requestAnimationFrame(scheduleFrame);
    };

    animationFrame = window.requestAnimationFrame(scheduleFrame);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [autoFlightEnabled, compact, invalidate, isActive, mobile, playEntry, prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!prefersReducedMotion) return;

    const controller = controllerRef.current;
    controller.basePosition.z = restingCameraZ;
    controller.velocity.z = 0;
    introProgressRef.current = 1;
    camera.position.set(controller.basePosition.x, controller.basePosition.y, controller.basePosition.z);
    camera.lookAt(controller.basePosition.x, controller.basePosition.y, controller.basePosition.z - 80);
  }, [camera, prefersReducedMotion, restingCameraZ]);

  useFrame((_, delta) => {
    if (!readySentRef.current) {
      readySentRef.current = true;
      onReady();
    }

    const controller = controllerRef.current;
    const keys = controller.keys;
    const keyboardSpeed = 0.08;

    if (keys.has("w") || keys.has("arrowup")) controller.velocity.z -= keyboardSpeed;
    if (keys.has("s") || keys.has("arrowdown")) controller.velocity.z += keyboardSpeed;
    if (!mobile) {
      if (keys.has("a") || keys.has("arrowleft")) controller.velocity.x -= keyboardSpeed;
      if (keys.has("d") || keys.has("arrowright")) controller.velocity.x += keyboardSpeed;
      if (keys.has("q")) controller.velocity.y -= keyboardSpeed;
      if (keys.has("e")) controller.velocity.y += keyboardSpeed;
    }

    if (!prefersReducedMotion) {
      const frameScale = Math.min(delta, 0.05) * 60;
      const entryBoost = compact ? INFINITE_COMPACT_ENTRY_BOOST : INFINITE_ENTRY_BOOST;
      const autoFlightBoost = compact ? INFINITE_COMPACT_AUTO_FLIGHT_BOOST : INFINITE_AUTO_FLIGHT_BOOST;

      if (isActive && introProgressRef.current < 1) {
        introProgressRef.current = Math.min(1, introProgressRef.current + delta / INFINITE_ENTRY_SECONDS);
        const easedProgress = THREE.MathUtils.smoothstep(introProgressRef.current, 0, 1);
        controller.velocity.z -= THREE.MathUtils.lerp(entryBoost, autoFlightBoost, easedProgress) * frameScale;
      } else if (isActive && autoFlightEnabled && !controller.isDragging) {
        controller.velocity.z -= autoFlightBoost * frameScale;
      }
    }

    controller.velocity.x = clampNumber(controller.velocity.x, -INFINITE_MAX_VELOCITY, INFINITE_MAX_VELOCITY);
    controller.velocity.y = clampNumber(controller.velocity.y, -INFINITE_MAX_VELOCITY, INFINITE_MAX_VELOCITY);
    controller.velocity.z = clampNumber(controller.velocity.z, -INFINITE_MAX_VELOCITY, INFINITE_MAX_VELOCITY);

    const compactMotionStep = mobile ? Math.min(delta, 0.05) * 30 : 1;
    controller.basePosition.x += controller.velocity.x * compactMotionStep;
    controller.basePosition.y += controller.velocity.y * compactMotionStep;
    controller.basePosition.z += controller.velocity.z * compactMotionStep;

    camera.position.set(controller.basePosition.x, controller.basePosition.y, controller.basePosition.z);
    camera.lookAt(controller.basePosition.x, controller.basePosition.y, controller.basePosition.z - 80);

    const velocityDecay = mobile ? Math.pow(INFINITE_VELOCITY_DECAY, compactMotionStep) : INFINITE_VELOCITY_DECAY;
    controller.velocity.x *= velocityDecay;
    controller.velocity.y *= velocityDecay;
    controller.velocity.z *= velocityDecay;

    const cx = Math.floor(controller.basePosition.x / INFINITE_CHUNK_SIZE);
    const cy = Math.floor(controller.basePosition.y / INFINITE_CHUNK_SIZE);
    const cz = Math.floor(controller.basePosition.z / INFINITE_CHUNK_SIZE);
    const chunkKey = `${cx},${cy},${cz}`;

    cameraGridRef.current = { cx, cy, cz, camZ: controller.basePosition.z };

    if (chunkKey !== controller.lastChunkKey) {
      controller.lastChunkKey = chunkKey;
      setPlanes(buildInfinitePlanes(cx, cy, cz, textures.length, compact, mobile));
    }

    const momentum = Math.abs(controller.velocity.x) + Math.abs(controller.velocity.y) + Math.abs(controller.velocity.z);
    if ((!isActive || !autoFlightEnabled) && momentum > 0.02) invalidate();
    if (controller.isDragging || keys.size > 0) invalidate();
  });

  return (
    <group scale={scale}>
      {planes.map((plane) => (
        <InfiniteCanvasPlane
          cameraGridRef={cameraGridRef}
          canvasImage={images[plane.mediaIndex % images.length]}
          compact={compact}
          key={plane.id}
          onIntent={onIntent}
          onOpen={onOpen}
          plane={plane}
          roundedMask={roundedMask}
          texture={textures[plane.mediaIndex % textures.length]}
        />
      ))}
    </group>
  );
}

function InfiniteCanvasWebGL({
  autoFlightEnabled,
  compact,
  images,
  isActive,
  mobile,
  playEntry,
  onReady,
  onIntent,
  onOpen,
  radiusPixels,
  scale
}: {
  autoFlightEnabled: boolean;
  compact: boolean;
  images: CanvasImage[];
  isActive: boolean;
  mobile: boolean;
  playEntry: boolean;
  onReady: () => void;
  onIntent: (href: string) => void;
  onOpen: (href: string) => void;
  radiusPixels: number;
  scale: number;
}) {
  const { gl } = useThree();
  const imageSources = useMemo(() => images.map((image) => image.src), [images]);
  const textures = useLoader(THREE.TextureLoader, imageSources);
  const roundedMask = useMemo(() => createRoundedAlphaMask(radiusPixels), [radiusPixels]);

  useEffect(() => () => roundedMask.dispose(), [roundedMask]);
  useEffect(() => {
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();

    textures.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(maxAnisotropy, compact ? 2 : 4);
      texture.generateMipmaps = !compact;
      texture.minFilter = compact ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
    });
  }, [compact, gl, textures]);

  return (
    <InfiniteCanvasField
      autoFlightEnabled={autoFlightEnabled}
      compact={compact}
      images={images}
      isActive={isActive}
      mobile={mobile}
      playEntry={playEntry}
      onReady={onReady}
      onIntent={onIntent}
      onOpen={onOpen}
      roundedMask={roundedMask}
      scale={scale}
      textures={textures}
    />
  );
}

function selectCanvasImages(images: CanvasImage[], limit: number) {
  const source = images.length > 0 ? images : fallbackImages;
  const uniqueImages = Array.from(new Map(source.map((image) => [image.src, image])).values());
  return uniqueImages.slice(0, limit);
}

export function FeaturedWorkCanvas({ works }: { works: Work[] }) {
  const router = useRouter();
  const { autoFlightEnabled, featuredActive } = useContext(FeaturedCanvasMotionContext);
  const clientSettings = useFeaturedCanvasClientSettings();
  const isCompact = clientSettings?.compact ?? false;
  const isMobile = clientSettings?.mobile ?? false;
  const playEntry = clientSettings?.playEntry ?? false;
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const siteRadiusPixels = useMemo(() => readCssLengthInPixels("--radius-site-sm", 8), []);
  const markCanvasReady = useCallback(() => {
    setIsCanvasReady(true);
  }, []);
  const detailHref = useCallback((href: string) => {
    const returnHref = currentWorkSurfaceHref("#works");
    return workDetailHrefWithReturn(href, returnHref);
  }, []);
  const prefetchWork = useCallback((href: string) => {
    const targetHref = detailHref(href);
    if (featuredPrefetchedHrefs.has(targetHref)) return;
    featuredPrefetchedHrefs.add(targetHref);
    router.prefetch(targetHref);
  }, [detailHref, router]);
  const openWork = useCallback((href: string) => {
    const returnHref = currentWorkSurfaceHref("#works");
    rememberWorkNavigation(returnHref);
    router.push(workDetailHrefWithReturn(href, returnHref));
  }, [router]);

  const images = useMemo<CanvasImage[]>(
    () =>
      works
        .filter((work) => work.cover.src)
        .map((work) => ({
          src: work.cover.src,
          alt: work.cover.alt || `${work.title} cover`,
          title: work.title,
          href: `/works/${work.slug}`
        })),
    [works]
  );
  const canvasImages = useMemo(
    () => selectCanvasImages(images, isCompact ? INFINITE_MOBILE_TEXTURE_LIMIT : INFINITE_DESKTOP_TEXTURE_LIMIT),
    [images, isCompact]
  );

  useEffect(() => {
    if (!featuredActive || !playEntry) return;
    window.sessionStorage.setItem(featuredEntryPlayedKey, "1");
  }, [featuredActive, playEntry]);

  useEffect(() => {
    if (!isCanvasReady || !clientSettings) return;

    const warmupImages = canvasImages.slice(0, isCompact ? 3 : 2);
    const timeout = window.setTimeout(() => {
      warmupImages.forEach((image) => prefetchWork(image.href));
    }, isCompact ? 120 : 360);

    return () => window.clearTimeout(timeout);
  }, [canvasImages, clientSettings, isCanvasReady, isCompact, prefetchWork]);

  return (
    <section className={`cw-featured-canvas notion-rb-infinite-canvas-stage ${isCanvasReady ? "is-canvas-ready" : ""}`} aria-label="Featured works">
      <div className="cw-featured-canvas-loader" aria-hidden="true">
        <span className="cw-featured-canvas-loader-track">
          <span className="cw-featured-canvas-loader-bar" />
        </span>
      </div>
      {clientSettings ? (
      <Canvas
        key={`${isMobile ? "mobile" : isCompact ? "compact" : "desktop"}-${playEntry ? "entry" : "direct"}`}
        className="notion-rb-infinite-canvas-webgl"
        camera={{
          position: [0, 0, playEntry ? (isCompact ? INFINITE_COMPACT_ENTRY_CAMERA_Z : INFINITE_ENTRY_CAMERA_Z) : (isCompact ? INFINITE_COMPACT_INITIAL_CAMERA_Z : INFINITE_INITIAL_CAMERA_Z)],
          fov: 46,
          near: 1,
          far: 230
        }}
        dpr={isMobile ? [1, 1.5] : isCompact ? 1 : [1, 1.5]}
        flat
        frameloop={isMobile && featuredActive && autoFlightEnabled ? "always" : "demand"}
        gl={{ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: false, stencil: false }}
      >
        <color attach="background" args={["#10130f"]} />
        <fog attach="fog" args={["#10130f", isCompact ? 92 : 76, isCompact ? 194 : 178]} />
        <Suspense fallback={null}>
          <InfiniteCanvasWebGL
            autoFlightEnabled={autoFlightEnabled}
            compact={isCompact}
            images={canvasImages}
            isActive={featuredActive}
            mobile={isMobile}
            playEntry={playEntry}
            onReady={markCanvasReady}
            onIntent={prefetchWork}
            onOpen={openWork}
            radiusPixels={siteRadiusPixels}
            scale={1}
          />
        </Suspense>
      </Canvas>
      ) : null}
    </section>
  );
}
