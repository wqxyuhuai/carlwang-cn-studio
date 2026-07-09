import path from "node:path";
import sharp from "sharp";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function isOptimizableImage(contentType = "") {
  return IMAGE_TYPES.has(String(contentType).toLowerCase());
}

export function optimizedObjectKeyFor(objectKey) {
  const directory = path.posix.dirname(objectKey);
  const extension = path.posix.extname(objectKey);
  const baseName = path.posix.basename(objectKey, extension).replace(/-optimized$/i, "");
  return `${directory}/${baseName}-optimized.webp`;
}

export function looksLikeImageObjectKey(objectKey = "") {
  const extension = path.posix.extname(objectKey.split("?")[0]).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension);
}

export function shouldSkipImageOptimization(objectKey = "", options = {}) {
  const cleanKey = objectKey.split("?")[0].toLowerCase();
  return cleanKey.endsWith(".svg") || (!options.includeOptimized && cleanKey.endsWith("-optimized.webp"));
}

export async function optimizeImageBuffer(buffer, contentType, options = {}) {
  if (!Buffer.isBuffer(buffer) || !isOptimizableImage(contentType)) return null;

  const quality = Number(options.quality || process.env.OPTIMIZE_WEBP_QUALITY || 80);
  const gifQuality = Number(options.gifQuality || process.env.OPTIMIZE_GIF_WEBP_QUALITY || 55);
  const maxWidth = Number(options.maxWidth || process.env.OPTIMIZE_MAX_WIDTH || 1366);
  const maxHeight = Number(options.maxHeight || process.env.OPTIMIZE_MAX_HEIGHT || 768);
  const animated = contentType === "image/gif" || contentType === "image/webp";

  let image = sharp(buffer, { animated, failOn: "none", limitInputPixels: false });
  const metadata = await image.metadata();
  const isAnimated = contentType === "image/gif" || Number(metadata.pages || 1) > 1;
  const minSavingRatio = isAnimated
    ? Number(options.gifMinSavingRatio ?? process.env.OPTIMIZE_GIF_MIN_SAVING_RATIO ?? 0)
    : Number(options.minSavingRatio || process.env.OPTIMIZE_MIN_SAVING_RATIO || 0.05);

  if (
    (metadata.width && maxWidth > 0 && metadata.width > maxWidth) ||
    (metadata.height && maxHeight > 0 && metadata.height > maxHeight)
  ) {
    image = image.resize({
      width: maxWidth > 0 ? maxWidth : undefined,
      height: maxHeight > 0 ? maxHeight : undefined,
      fit: "inside",
      withoutEnlargement: true
    });
  }

  const optimizedBuffer = await image
    .rotate()
    .webp({
      quality: isAnimated ? gifQuality : quality,
      effort: 5,
      animated
    })
    .toBuffer();

  const savingRatio = 1 - optimizedBuffer.length / buffer.length;
  if (savingRatio < minSavingRatio) return null;

  return {
    buffer: optimizedBuffer,
    contentType: "image/webp",
    originalBytes: buffer.length,
    optimizedBytes: optimizedBuffer.length,
    savingRatio,
    width: metadata.width || null,
    height: metadata.height || null
  };
}
