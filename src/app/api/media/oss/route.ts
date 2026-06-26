import { NextRequest } from "next/server";

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

  const upstream = await fetch(sourceUrl, {
    headers: request.headers.get("range") ? { Range: request.headers.get("range") || "" } : undefined
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(await upstream.text().catch(() => "Media fetch failed."), { status: upstream.status });
  }

  const body = await upstream.arrayBuffer();
  const bytes = new Uint8Array(body);
  const contentType = contentTypeFromBytes(bytes, upstream.headers.get("content-type")?.split(";")[0] || "");

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", "inline");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  for (const name of ["accept-ranges", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Content-Length", String(body.byteLength));

  return new Response(body, { status: upstream.status, headers });
}
