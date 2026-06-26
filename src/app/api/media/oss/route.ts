import { NextRequest } from "next/server";

const CACHE_MAX_AGE_SECONDS = 31_536_000;
const DISK_CACHE_DIR = ".media-cache/oss";

type CachedMedia = {
  body: Uint8Array;
  contentType: string;
  status: number;
  contentRange?: string;
  acceptRanges?: string;
};

type RuntimeMediaCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

function isAllowedOssUrl(url: URL) {
  return url.protocol === "https:" && /^[a-z0-9-]+\.oss-[a-z0-9-]+\.aliyuncs\.com$/i.test(url.hostname);
}

function contentTypeFromBytes(bytes: Uint8Array, fallback: string) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));

  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 8 && ascii(1, 4) === "PNG") return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "image/gif";
  if (bytes.length >= 12 && ascii(4, 8) === "ftyp") return "video/mp4";
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "video/webm";
  if (bytes.length >= 5 && ascii(0, 5) === "%PDF-") return "application/pdf";

  return fallback || "application/octet-stream";
}

function cacheHeaders(media: CachedMedia, cacheStatus: string) {
  const headers = new Headers();
  headers.set("Content-Type", media.contentType);
  headers.set("Content-Disposition", "inline");
  headers.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE_SECONDS}, immutable`);
  headers.set("Content-Length", String(media.body.byteLength));
  headers.set("X-Media-Cache", cacheStatus);

  if (media.acceptRanges) headers.set("Accept-Ranges", media.acceptRanges);
  if (media.contentRange) headers.set("Content-Range", media.contentRange);

  return headers;
}

function mediaResponse(media: CachedMedia, cacheStatus: string) {
  const body = new Blob([media.body as BlobPart]);
  return new Response(body, {
    status: media.status,
    headers: cacheHeaders(media, cacheStatus)
  });
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getRuntimeCache() {
  if (typeof caches === "undefined") return null;
  const cacheStorage = caches as unknown as {
    default?: RuntimeMediaCache;
    open?: (name: string) => Promise<RuntimeMediaCache>;
  };
  if (cacheStorage.default) return cacheStorage.default;
  return cacheStorage.open?.("oss-media") || null;
}

async function diskPaths(sourceUrl: string) {
  try {
    const [{ default: path }, { mkdir }] = await Promise.all([import("node:path"), import("node:fs/promises")]);
    const key = await sha256Hex(sourceUrl);
    const directory = path.join(process.cwd(), DISK_CACHE_DIR);
    await mkdir(directory, { recursive: true });
    return {
      dataPath: path.join(directory, `${key}.bin`),
      metaPath: path.join(directory, `${key}.json`)
    };
  } catch {
    return null;
  }
}

async function readDiskCache(sourceUrl: string): Promise<CachedMedia | null> {
  try {
    const paths = await diskPaths(sourceUrl);
    if (!paths) return null;

    const { readFile } = await import("node:fs/promises");
    const [metaSource, body] = await Promise.all([
      readFile(paths.metaPath, "utf8"),
      readFile(paths.dataPath)
    ]);
    const meta = JSON.parse(metaSource) as Omit<CachedMedia, "body"> & { expiresAt?: number };

    if (!meta.expiresAt || meta.expiresAt <= Date.now()) return null;

    return {
      body: new Uint8Array(body),
      contentType: meta.contentType,
      status: meta.status,
      contentRange: meta.contentRange,
      acceptRanges: meta.acceptRanges
    };
  } catch {
    return null;
  }
}

async function writeDiskCache(sourceUrl: string, media: CachedMedia) {
  try {
    const paths = await diskPaths(sourceUrl);
    if (!paths) return;

    const { writeFile } = await import("node:fs/promises");
    await Promise.all([
      writeFile(paths.dataPath, media.body),
      writeFile(paths.metaPath, JSON.stringify({
        contentType: media.contentType,
        status: media.status,
        contentRange: media.contentRange,
        acceptRanges: media.acceptRanges,
        expiresAt: Date.now() + CACHE_MAX_AGE_SECONDS * 1000
      }))
    ]);
  } catch {
    // Cache writes are best-effort. The media response should still succeed.
  }
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) return new Response("Missing url.", { status: 400 });

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(rawUrl);
  } catch {
    return new Response("Invalid url.", { status: 400 });
  }

  if (!isAllowedOssUrl(sourceUrl)) {
    return new Response("Unsupported media host.", { status: 400 });
  }

  const hasRange = Boolean(request.headers.get("range"));
  const runtimeCache = hasRange ? null : await getRuntimeCache();
  const runtimeCacheKey = new Request(request.url, { method: "GET" });
  const runtimeHit = await runtimeCache?.match(runtimeCacheKey);
  if (runtimeHit) {
    const response = new Response(runtimeHit.body, runtimeHit);
    response.headers.set("X-Media-Cache", "runtime-hit");
    return response;
  }

  if (!hasRange) {
    const diskHit = await readDiskCache(sourceUrl.href);
    if (diskHit) {
      const response = mediaResponse(diskHit, "disk-hit");
      await runtimeCache?.put(runtimeCacheKey, response.clone());
      return response;
    }
  }

  const upstream = await fetch(sourceUrl, {
    headers: hasRange ? { Range: request.headers.get("range") || "" } : undefined
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(await upstream.text().catch(() => "Media fetch failed."), { status: upstream.status });
  }

  const body = await upstream.arrayBuffer();
  const bytes = new Uint8Array(body);
  const contentType = contentTypeFromBytes(bytes, upstream.headers.get("content-type")?.split(";")[0] || "");
  const media = {
    body: bytes,
    contentType,
    status: upstream.status,
    contentRange: upstream.headers.get("content-range") || undefined,
    acceptRanges: upstream.headers.get("accept-ranges") || undefined
  };

  const response = mediaResponse(media, "miss");

  if (!hasRange) {
    await Promise.all([
      writeDiskCache(sourceUrl.href, media),
      runtimeCache?.put(runtimeCacheKey, response.clone()) || Promise.resolve()
    ]);
  }

  return response;
}
