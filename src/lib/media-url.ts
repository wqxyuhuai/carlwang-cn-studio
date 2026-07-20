const aliyunOssHostPattern = /^[a-z0-9-]+\.oss-[a-z0-9-]+\.aliyuncs\.com$/i;

export function proxyOssMediaUrl(src: string) {
  if (!src || src.startsWith("/api/media/oss?")) return src;

  try {
    const url = new URL(src);
    if (aliyunOssHostPattern.test(url.hostname)) {
      return `/api/media/oss?url=${encodeURIComponent(src)}`;
    }
  } catch {
    return src;
  }

  return src;
}

export function optimizedImageUrl(src: string, width = 1080, quality = 75) {
  if (!src || src.startsWith("data:") || src.startsWith("/_next/image?")) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
