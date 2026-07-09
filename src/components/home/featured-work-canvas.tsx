"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import type { Work } from "@/lib/types";
import { currentWorkSurfaceHref, rememberWorkReturnHref, workDetailHrefWithReturn } from "@/lib/work-detail-return";

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
const INFINITE_FADE_MARGIN = 1;
const INFINITE_ENTRY_CAMERA_Z = 132;
const INFINITE_INITIAL_CAMERA_Z = 52;
const INFINITE_MAX_VELOCITY = 1.9;
const INFINITE_VELOCITY_LERP = 0.16;
const INFINITE_VELOCITY_DECAY = 0.9;
const INFINITE_ENTRY_SECONDS = 4.2;
const INFINITE_ENTRY_BOOST = 0.1;
const INFINITE_AUTO_FLIGHT_BOOST = 0.0065;
const INFINITE_PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1);

export const FeaturedCanvasMotionContext = createContext({ autoFlightEnabled: true, featuredActive: true });

const INFINITE_CHUNK_OFFSETS = (() => {
  const maxDistance = INFINITE_RENDER_DISTANCE + INFINITE_FADE_MARGIN;
  const offsets: Array<[number, number, number]> = [];

  for (let dx = -maxDistance; dx <= maxDistance; dx += 1) {
    for (let dy = -maxDistance; dy <= maxDistance; dy += 1) {
      for (let dz = -maxDistance; dz <= maxDistance; dz += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) <= maxDistance) {
          offsets.push([dx, dy, dz]);
        }
      }
    }
  }

  return offsets;
})();

function shouldPlayFeaturedEntry() {
  if (typeof window === "undefined") return true;

  const storageKey = "cw-featured-entry-played";
  if (window.sessionStorage.getItem(storageKey) === "1") return false;

  window.sessionStorage.setItem(storageKey, "1");
  return true;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
  const count = compact ? 3 : mediaCount >= 23 ? 8 : 7;

  return Array.from({ length: count }, (_, index) => {
    const base = seed + index * 997;
    const random = (offset: number) => seededUnit(base + offset);
    const isCenterChunk = cx === 0 && cy === 0;
    const centerFiller = !compact && isCenterChunk && index < 4;
    const edgeSweep = !compact && index === count - 1 && random(8) > 0.56;
    const size = centerFiller
      ? 2.6 + random(4) * 3.8
      : ((compact ? 3.2 : 4.6) + random(4) * (compact ? 4.2 : 6.4)) * (edgeSweep ? 1.52 : 1);
    const ringAngle = random(0) * Math.PI * 2;
    const centerAngle = (index / 4) * Math.PI * 2 + (random(12) - 0.5) * 0.72;
    const centerRadius = 12 + random(13) * 19;
    const ringRadius = (compact ? 18 : 22) + random(1) * (compact ? 24 : 38);
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
      mediaIndex: Math.floor(random(5) * mediaCount) % mediaCount,
      chunk: [cx, cy, cz]
    };
  });
}

function buildInfinitePlanes(cx: number, cy: number, cz: number, mediaCount: number, compact: boolean) {
  return INFINITE_CHUNK_OFFSETS.flatMap(([dx, dy, dz]) => generateInfiniteChunkPlanes(cx + dx, cy + dy, cz + dz, mediaCount, compact));
}

function InfiniteCanvasPlane({
  cameraGridRef,
  canvasImage,
  onOpen,
  plane,
  texture
}: {
  cameraGridRef: RefObject<InfiniteCameraGridState>;
  canvasImage: CanvasImage;
  onOpen: (href: string) => void;
  plane: InfinitePlaneData;
  texture: THREE.Texture;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const opacityRef = useRef(0);
  const image = texture.image as { width?: number; height?: number } | undefined;
  const aspect = image?.width && image?.height ? image.width / image.height : 1;

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
        : clampNumber(1 - (chunkDistance - INFINITE_RENDER_DISTANCE) / Math.max(INFINITE_FADE_MARGIN, 0.0001), 0, 1);
    const depthDistance = Math.abs(plane.position[2] - cameraGrid.camZ);
    const depthFade = depthDistance < 62 ? 1 : clampNumber(1 - (depthDistance - 62) / 68, 0, 1);
    const targetOpacity = chunkFade * depthFade * depthFade;

    opacityRef.current = targetOpacity < 0.01 && opacityRef.current < 0.01 ? 0 : THREE.MathUtils.lerp(opacityRef.current, targetOpacity, 0.18);
    material.opacity = opacityRef.current;
    material.depthWrite = opacityRef.current > 0.98;
    mesh.visible = opacityRef.current > 0.012;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={INFINITE_PLANE_GEOMETRY}
      position={plane.position}
      rotation={[0, 0, plane.rotation]}
      scale={[plane.size * aspect, plane.size, 1]}
      onClick={(event) => {
        event.stopPropagation();
        if (event.delta > 6) return;
        onOpen(canvasImage.href);
      }}
      visible={false}
    >
      <meshBasicMaterial ref={materialRef} map={texture} transparent opacity={0} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

function InfiniteCanvasField({
  autoFlightEnabled,
  compact,
  images,
  isActive,
  playEntry,
  onReady,
  onOpen,
  scale,
  textures
}: {
  autoFlightEnabled: boolean;
  compact: boolean;
  images: CanvasImage[];
  isActive: boolean;
  playEntry: boolean;
  onReady: () => void;
  onOpen: (href: string) => void;
  scale: number;
  textures: THREE.Texture[];
}) {
  const { camera, gl } = useThree();
  const initialCameraZ = playEntry ? INFINITE_ENTRY_CAMERA_Z : INFINITE_INITIAL_CAMERA_Z;
  const cameraGridRef = useRef<InfiniteCameraGridState>({ cx: 0, cy: 0, cz: 0, camZ: initialCameraZ });
  const readySentRef = useRef(false);
  const introProgressRef = useRef(playEntry ? 0 : 1);
  const controllerRef = useRef({
    velocity: { x: 0, y: 0, z: 0 },
    targetVelocity: { x: 0, y: 0, z: 0 },
    basePosition: { x: 0, y: 0, z: initialCameraZ },
    lastMouse: { x: 0, y: 0 },
    scrollAccum: 0,
    isDragging: false,
    keys: new Set<string>(),
    lastChunkKey: ""
  });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [planes, setPlanes] = useState(() => buildInfinitePlanes(0, 0, 0, textures.length, compact));

  useEffect(() => {
    const canvas = gl.domElement;
    const controller = controllerRef.current;

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      event.preventDefault();
      controller.isDragging = true;
      controller.lastMouse = { x: event.clientX, y: event.clientY };
    };

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (!controller.isDragging) return;

      const zoomFactor = clampNumber(Math.abs(controller.basePosition.z) / INFINITE_INITIAL_CAMERA_Z, 0.45, 1.8);
      controller.targetVelocity.x -= (event.clientX - controller.lastMouse.x) * 0.018 * zoomFactor;
      controller.targetVelocity.y += (event.clientY - controller.lastMouse.y) * 0.018 * zoomFactor;
      controller.lastMouse = { x: event.clientX, y: event.clientY };
    };

    const stopDrag = () => {
      controller.isDragging = false;
    };

    const handleWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      controller.scrollAccum += event.deltaY * 0.0038;
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      controller.keys.add(event.key.toLowerCase());
    };

    const handleKeyUp = (event: globalThis.KeyboardEvent) => {
      controller.keys.delete(event.key.toLowerCase());
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDrag);
    canvas.addEventListener("pointerleave", stopDrag);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDrag);
      canvas.removeEventListener("pointerleave", stopDrag);
      canvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gl]);

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
    controller.basePosition.z = INFINITE_INITIAL_CAMERA_Z;
    controller.targetVelocity.z = 0;
    controller.velocity.z = 0;
    introProgressRef.current = 1;
    camera.position.set(controller.basePosition.x, controller.basePosition.y, controller.basePosition.z);
    camera.lookAt(controller.basePosition.x, controller.basePosition.y, controller.basePosition.z - 80);
  }, [camera, prefersReducedMotion]);

  useFrame((_, delta) => {
    if (!readySentRef.current) {
      readySentRef.current = true;
      window.requestAnimationFrame(onReady);
    }

    const controller = controllerRef.current;
    const keys = controller.keys;
    const keyboardSpeed = 0.08;

    if (keys.has("w") || keys.has("arrowup")) controller.targetVelocity.z -= keyboardSpeed;
    if (keys.has("s") || keys.has("arrowdown")) controller.targetVelocity.z += keyboardSpeed;
    if (keys.has("a") || keys.has("arrowleft")) controller.targetVelocity.x -= keyboardSpeed;
    if (keys.has("d") || keys.has("arrowright")) controller.targetVelocity.x += keyboardSpeed;
    if (keys.has("q")) controller.targetVelocity.y -= keyboardSpeed;
    if (keys.has("e")) controller.targetVelocity.y += keyboardSpeed;

    if (!prefersReducedMotion) {
      const frameScale = Math.min(delta, 0.05) * 60;

      if (isActive && introProgressRef.current < 1) {
        introProgressRef.current = Math.min(1, introProgressRef.current + delta / INFINITE_ENTRY_SECONDS);
        const easedProgress = THREE.MathUtils.smoothstep(introProgressRef.current, 0, 1);
        controller.targetVelocity.z -= THREE.MathUtils.lerp(INFINITE_ENTRY_BOOST, INFINITE_AUTO_FLIGHT_BOOST, easedProgress) * frameScale;
      } else if (isActive && autoFlightEnabled && !controller.isDragging) {
        controller.targetVelocity.z -= INFINITE_AUTO_FLIGHT_BOOST * frameScale;
      }
    }

    controller.targetVelocity.z += controller.scrollAccum;
    controller.scrollAccum *= 0.78;

    controller.targetVelocity.x = clampNumber(controller.targetVelocity.x, -INFINITE_MAX_VELOCITY, INFINITE_MAX_VELOCITY);
    controller.targetVelocity.y = clampNumber(controller.targetVelocity.y, -INFINITE_MAX_VELOCITY, INFINITE_MAX_VELOCITY);
    controller.targetVelocity.z = clampNumber(controller.targetVelocity.z, -INFINITE_MAX_VELOCITY, INFINITE_MAX_VELOCITY);

    controller.velocity.x = THREE.MathUtils.lerp(controller.velocity.x, controller.targetVelocity.x, INFINITE_VELOCITY_LERP);
    controller.velocity.y = THREE.MathUtils.lerp(controller.velocity.y, controller.targetVelocity.y, INFINITE_VELOCITY_LERP);
    controller.velocity.z = THREE.MathUtils.lerp(controller.velocity.z, controller.targetVelocity.z, INFINITE_VELOCITY_LERP);

    controller.basePosition.x += controller.velocity.x;
    controller.basePosition.y += controller.velocity.y;
    controller.basePosition.z += controller.velocity.z;

    camera.position.set(controller.basePosition.x, controller.basePosition.y, controller.basePosition.z);
    camera.lookAt(controller.basePosition.x, controller.basePosition.y, controller.basePosition.z - 80);

    controller.targetVelocity.x *= INFINITE_VELOCITY_DECAY;
    controller.targetVelocity.y *= INFINITE_VELOCITY_DECAY;
    controller.targetVelocity.z *= INFINITE_VELOCITY_DECAY;

    const cx = Math.floor(controller.basePosition.x / INFINITE_CHUNK_SIZE);
    const cy = Math.floor(controller.basePosition.y / INFINITE_CHUNK_SIZE);
    const cz = Math.floor(controller.basePosition.z / INFINITE_CHUNK_SIZE);
    const chunkKey = `${cx},${cy},${cz}`;

    cameraGridRef.current = { cx, cy, cz, camZ: controller.basePosition.z };

    if (chunkKey !== controller.lastChunkKey) {
      controller.lastChunkKey = chunkKey;
      setPlanes(buildInfinitePlanes(cx, cy, cz, textures.length, compact));
    }
  });

  return (
    <group scale={scale}>
      {planes.map((plane) => (
        <InfiniteCanvasPlane
          cameraGridRef={cameraGridRef}
          canvasImage={images[plane.mediaIndex % images.length]}
          key={plane.id}
          onOpen={onOpen}
          plane={plane}
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
  playEntry,
  onReady,
  onOpen,
  scale
}: {
  autoFlightEnabled: boolean;
  compact: boolean;
  images: CanvasImage[];
  isActive: boolean;
  playEntry: boolean;
  onReady: () => void;
  onOpen: (href: string) => void;
  scale: number;
}) {
  const imageSources = useMemo(() => images.map((image) => image.src), [images]);
  const textures = useLoader(THREE.TextureLoader, imageSources);

  textures.forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 6;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
  });

  return (
    <InfiniteCanvasField
      autoFlightEnabled={autoFlightEnabled}
      compact={compact}
      images={images}
      isActive={isActive}
      playEntry={playEntry}
      onReady={onReady}
      onOpen={onOpen}
      scale={scale}
      textures={textures}
    />
  );
}

function repeatImages(images: CanvasImage[], count: number) {
  const source = images.length > 0 ? images : fallbackImages;
  return Array.from({ length: count }, (_, index) => source[index % source.length]);
}

export function FeaturedWorkCanvas({ works }: { works: Work[] }) {
  const router = useRouter();
  const { autoFlightEnabled, featuredActive } = useContext(FeaturedCanvasMotionContext);
  const [playEntry, setPlayEntry] = useState(() => (featuredActive ? shouldPlayFeaturedEntry() : false));
  const entryResolvedRef = useRef(featuredActive);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const openWork = useCallback((href: string) => {
    const returnHref = currentWorkSurfaceHref("#works");
    rememberWorkReturnHref(returnHref);
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
  const canvasImages = repeatImages(images, 24);

  useEffect(() => {
    if (!featuredActive || entryResolvedRef.current) return;

    entryResolvedRef.current = true;
    setPlayEntry(shouldPlayFeaturedEntry());
  }, [featuredActive]);

  return (
    <section className={`cw-featured-canvas notion-rb-infinite-canvas-stage ${isCanvasReady ? "is-canvas-ready" : ""}`} aria-label="Featured works">
      <div className="cw-featured-canvas-loader" aria-hidden="true">
        <span className="cw-featured-canvas-loader-track">
          <span className="cw-featured-canvas-loader-bar" />
        </span>
      </div>
      <Canvas
        key={playEntry ? "entry" : "direct"}
        className="notion-rb-infinite-canvas-webgl"
        camera={{ position: [0, 0, playEntry ? INFINITE_ENTRY_CAMERA_Z : INFINITE_INITIAL_CAMERA_Z], fov: 46, near: 1, far: 230 }}
        dpr={[1, 1.5]}
        flat
        gl={{ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      >
        <color attach="background" args={["#10130f"]} />
        <fog attach="fog" args={["#10130f", 76, 178]} />
        <Suspense fallback={null}>
          <InfiniteCanvasWebGL
            autoFlightEnabled={autoFlightEnabled}
            compact={false}
            images={canvasImages}
            isActive={featuredActive}
            playEntry={playEntry}
            onReady={() => setIsCanvasReady(true)}
            onOpen={openWork}
            scale={1}
          />
        </Suspense>
      </Canvas>
    </section>
  );
}
