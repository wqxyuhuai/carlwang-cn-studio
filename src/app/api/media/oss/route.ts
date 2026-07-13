import { NextRequest } from "next/server";

const CACHE_MAX_AGE_SECONDS = 31_536_000;
const DISK_CACHE_DIR = ".media-cache/oss";
const RANGE_RUNTIME_CACHE_MAX_BYTES = 8 * 1024 * 1024;
const OPEN_ENDED_RANGE_CHUNK_BYTES = 2 * 1024 * 1024;

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

type ByteRange = {
  end: number;
  start: number;
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
  headers.set("CDN-Cache-Control", `public, max-age=${CACHE_MAX_AGE_SECONDS}, immutable`);
  headers.set("Cloudflare-CDN-Cache-Control", `public, max-age=${CACHE_MAX_AGE_SECONDS}, immutable`);
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

function runtimeCacheKey(url: string) {
  return new Request(url, { method: "GET" });
}

function runtimeRangeCacheKey(url: string, rangeHeader: string) {
  const cacheUrl = new URL(url);
  cacheUrl.searchParams.set("__range", rangeHeader);
  return new Request(cacheUrl.toString(), { method: "GET" });
}

function boundedRangeHeader(rangeHeader: string | null) {
  if (!rangeHeader) return null;

  const match = rangeHeader.match(/^bytes=(\d+)-$/);
  if (!match) return rangeHeader;

  const start = Number(match[1]);
  if (!Number.isFinite(start) || start < 0) return rangeHeader;

  return `bytes=${start}-${start + OPEN_ENDED_RANGE_CHUNK_BYTES - 1}`;
}

function contentTypeFromUrl(sourceUrl: URL, fallback: string) {
  const pathname = sourceUrl.pathname.toLowerCase();
  if (pathname.endsWith(".mp4")) return "video/mp4";
  if (pathname.endsWith(".webm")) return "video/webm";
  return fallback || "application/octet-stream";
}

function streamedUpstreamResponse(upstream: Response, sourceUrl: URL) {
  const headers = new Headers();
  headers.set("Content-Type", contentTypeFromUrl(sourceUrl, upstream.headers.get("content-type")?.split(";")[0] || ""));
  headers.set("Content-Disposition", "inline");
  headers.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE_SECONDS}, immutable`);
  headers.set("CDN-Cache-Control", `public, max-age=${CACHE_MAX_AGE_SECONDS}, immutable`);
  headers.set("Cloudflare-CDN-Cache-Control", `public, max-age=${CACHE_MAX_AGE_SECONDS}, immutable`);
  headers.set("X-Media-Cache", "stream-miss");

  for (const name of ["accept-ranges", "content-length", "content-range"] as const) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers
  });
}

function parseByteRange(rangeHeader: string | null, size: number): ByteRange | null {
  if (!rangeHeader || size <= 0) return null;

  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    const start = Math.max(0, size - suffixLength);
    return { start, end: size - 1 };
  }

  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) return null;

  return {
    start,
    end: Math.min(end, size - 1)
  };
}

function rangeResponseFromFullMedia(media: CachedMedia, rangeHeader: string | null, cacheStatus: string) {
  if (media.status !== 200 || media.contentRange) return null;

  const range = parseByteRange(rangeHeader, media.body.byteLength);
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${media.body.byteLength}`
      }
    });
  }

  const body = media.body.slice(range.start, range.end + 1);
  return mediaResponse({
    body,
    contentType: media.contentType,
    status: 206,
    contentRange: `bytes ${range.start}-${range.end}/${media.body.byteLength}`,
    acceptRanges: "bytes"
  }, cacheStatus);
}

async function cachedMediaFromRuntimeHit(response: Response): Promise<CachedMedia> {
  const body = new Uint8Array(await response.arrayBuffer());
  return {
    body,
    contentType: response.headers.get("content-type")?.split(";")[0] || "application/octet-stream",
    status: response.status,
    contentRange: response.headers.get("content-range") || undefined,
    acceptRanges: response.headers.get("accept-ranges") || undefined
  };
}

async function cachedRangeResponseFromRuntimeHit(response: Response, cacheStatus: string) {
  const media = await cachedMediaFromRuntimeHit(response);
  if (!media.contentRange) return null;

  return mediaResponse({
    ...media,
    status: 206,
    acceptRanges: media.acceptRanges || "bytes"
  }, cacheStatus);
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

  const rangeHeader = request.headers.get("range");
  const upstreamRangeHeader = boundedRangeHeader(rangeHeader);
  const hasRange = Boolean(rangeHeader);
  const runtimeCache = await getRuntimeCache();
  const fullCacheKey = runtimeCacheKey(request.url);
  const rangeCacheKey = hasRange ? runtimeRangeCacheKey(request.url, rangeHeader || "") : null;
  const runtimeHit = await runtimeCache?.match(fullCacheKey);
  if (runtimeHit) {
    if (hasRange) {
      const media = await cachedMediaFromRuntimeHit(runtimeHit);
      const response = rangeResponseFromFullMedia(media, rangeHeader, "runtime-range-hit");
      if (response) return response;
    }

    const response = new Response(runtimeHit.body, runtimeHit);
    response.headers.set("X-Media-Cache", "runtime-hit");
    return response;
  }

  if (rangeCacheKey) {
    const rangeHit = await runtimeCache?.match(rangeCacheKey);
    if (rangeHit) {
      const response = await cachedRangeResponseFromRuntimeHit(rangeHit, "runtime-range-partial-hit");
      if (response) return response;
    }
  }

  const diskHit = await readDiskCache(sourceUrl.href);
  if (diskHit) {
    if (hasRange) {
      const response = rangeResponseFromFullMedia(diskHit, rangeHeader, "disk-range-hit");
      if (response) return response;
    }

    const response = mediaResponse(diskHit, "disk-hit");
    await runtimeCache?.put(fullCacheKey, response.clone());
    return response;
  }

  const upstream = await fetch(sourceUrl, {
    headers: upstreamRangeHeader ? { Range: upstreamRangeHeader } : undefined
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(await upstream.text().catch(() => "Media fetch failed."), { status: upstream.status });
  }

  if (hasRange && upstream.status === 206 && upstream.body) {
    return streamedUpstreamResponse(upstream, sourceUrl);
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
      runtimeCache?.put(fullCacheKey, response.clone()) || Promise.resolve()
    ]);
  } else if (rangeCacheKey && media.status === 206 && media.body.byteLength <= RANGE_RUNTIME_CACHE_MAX_BYTES) {
    await runtimeCache?.put(rangeCacheKey, mediaResponse({
      ...media,
      status: 200,
      acceptRanges: media.acceptRanges || "bytes"
    }, "range-partial-store"));
  }

  return response;
}
