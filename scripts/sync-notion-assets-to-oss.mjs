import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import OSS from "ali-oss";
import { Client } from "@notionhq/client";
import { optimizeImageBuffer, optimizedObjectKeyFor } from "./lib/asset-optimizer.mjs";
import { configureProxyFromEnv } from "./lib/proxy.mjs";

const ENV_PATH = path.resolve(".env.local");
const SYNC_STATUS_NAME = String.fromCharCode(0x540c, 0x6b65, 0x72b6, 0x6001);
const SYNCED_STATUS = String.fromCharCode(0x5df2, 0x540c, 0x6b65);
const WAITING_SYNC_STATUS = String.fromCharCode(0x5f85, 0x540c, 0x6b65);
const WAITING_UPDATE_STATUS = String.fromCharCode(0x5f85, 0x66f4, 0x65b0);
const EDITING_STATUS = String.fromCharCode(0x7f16, 0x8f91, 0x4e2d);
const MAX_FILE_SIZE = 200 * 1024 * 1024;
const ASSET_TIMEOUT_MS = Number(process.env.ASSET_TIMEOUT_MS || 20000);
const ASSET_PROGRESS_MS = Number(process.env.ASSET_PROGRESS_MS || 5000);
const MAX_FAILED_MEDIA_PER_ITEM = Number(process.env.MAX_FAILED_MEDIA_PER_ITEM || 3);
const LOCAL_ASSET_MAX_FILES = Number(process.env.LOCAL_ASSET_MAX_FILES || 500);
const LOCAL_PATH_PROPERTY_NAMES = [
  String.fromCharCode(0x672c, 0x5730, 0x5730, 0x5740),
  "Local Path",
  "Local Folder",
  "Local Asset Folder",
  "Local Assets"
];
const GENERIC_LOCAL_MATCH_STEMS = new Set(["asset", "image", "video", "file", "pdf", "media"]);
const BODY_FALLBACK_EXCLUDED_STEMS = new Set(["cover", "poster", "thumbnail"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);
const DOCUMENT_EXTENSIONS = new Set(["pdf"]);

const tables = {
  categories: {
    label: "Studio Project Categories",
    dataSourceEnv: "NOTION_WORK_TYPES_DATABASE_ID",
    tableFolder: "studio-project-categories",
    titleProperty: "Category",
    fileProperties: ["Cover"]
  },
  projects: {
    label: "Studio Projects",
    dataSourceEnv: "NOTION_WORKS_DATABASE_ID",
    tableFolder: "studio-projects",
    titleProperty: "Title",
    slugProperty: "Slug",
    fileProperties: ["Cover"],
    localPathProperties: LOCAL_PATH_PROPERTY_NAMES,
    includeBodyMedia: true
  },
  tools: {
    label: "Studio Tools",
    dataSourceEnv: "NOTION_TOOLS_DATABASE_ID",
    tableFolder: "studio-tools",
    titleProperty: "Name",
    fileProperties: ["Logo SVG"]
  },
  social: {
    label: "Studio Social Links",
    dataSourceEnv: "NOTION_SOCIAL_LINKS_DATABASE_ID",
    tableFolder: "studio-social-links",
    titleProperty: "Platform",
    fileProperties: ["Black Logo", "Color Logo"]
  },
  experience: {
    label: "Studio Experience",
    dataSourceEnv: "NOTION_ABOUT_EXPERIENCE_DATABASE_ID",
    tableFolder: "studio-experience",
    titleProperty: "Title",
    fileProperties: ["Company Logo"]
  }
};

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
  return env;
}

function envValue(...keys) {
  for (const key of keys) {
    if (process.env[key]) return process.env[key];
  }
  return "";
}

function getOssConfig() {
  return {
    accessKeyId: envValue("ALIYUN_OSS_ACCESS_KEY_ID", "ALIYUN_ACCESS_KEY_ID"),
    accessKeySecret: envValue("ALIYUN_OSS_ACCESS_KEY_SECRET", "ALIYUN_ACCESS_KEY_SECRET"),
    region: envValue("ALIYUN_OSS_REGION"),
    endpoint: envValue("ALIYUN_OSS_ENDPOINT"),
    bucket: envValue("ALIYUN_OSS_BUCKET"),
    publicBaseUrl: envValue("ALIYUN_OSS_PUBLIC_BASE_URL"),
    uploadPrefix: envValue("ALIYUN_OSS_UPLOAD_PREFIX", "ALIYUN_OSS_DIR") || "uploads/admin",
    assetManifestKey: envValue("ALIYUN_OSS_ASSET_MANIFEST_KEY") || `${envValue("ALIYUN_OSS_UPLOAD_PREFIX", "ALIYUN_OSS_DIR") || "uploads/admin"}/notion-sync/.asset-manifest.json`
  };
}

function requiredEnv() {
  const oss = getOssConfig();
  return [
    ["NOTION_TOKEN", Boolean(process.env.NOTION_TOKEN)],
    ["ALIYUN_ACCESS_KEY_ID or ALIYUN_OSS_ACCESS_KEY_ID", Boolean(oss.accessKeyId)],
    ["ALIYUN_ACCESS_KEY_SECRET or ALIYUN_OSS_ACCESS_KEY_SECRET", Boolean(oss.accessKeySecret)],
    ["ALIYUN_OSS_BUCKET", Boolean(oss.bucket)],
    ["ALIYUN_OSS_REGION or ALIYUN_OSS_ENDPOINT", Boolean(oss.region || oss.endpoint)],
    ["ALIYUN_OSS_PUBLIC_BASE_URL", Boolean(oss.publicBaseUrl)]
  ];
}

function createOssClient() {
  const config = getOssConfig();
  return new OSS({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    endpoint: config.endpoint || undefined,
    region: config.region || undefined
  });
}

function slugify(value, fallback = "item") {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || fallback;
}

function textFromRichText(value) {
  if (!Array.isArray(value)) return "";
  return value.map((part) => part?.plain_text || "").join("");
}

function titleFromProperty(property) {
  return textFromRichText(property?.title);
}

function richTextFromProperty(property) {
  return textFromRichText(property?.rich_text);
}

function plainTextFromProperty(property) {
  if (!property) return "";
  if (property.type === "title") return titleFromProperty(property);
  if (property.type === "rich_text") return richTextFromProperty(property);
  if (property.type === "url") return property.url || "";
  if (property.type === "email") return property.email || "";
  if (property.type === "phone_number") return property.phone_number || "";
  if (property.type === "formula") {
    const formula = property.formula;
    if (formula?.type === "string") return formula.string || "";
    if (formula?.type === "number" && typeof formula.number === "number") return String(formula.number);
    if (formula?.type === "date") return formula.date?.start || "";
    if (formula?.type === "boolean") return formula.boolean ? "true" : "false";
  }
  return "";
}

function fileArrayFromProperty(property) {
  if (!property || property.type !== "files" || !Array.isArray(property.files)) return [];
  return property.files;
}

function mediaPayload(block) {
  if (!block?.type || !block[block.type]) return null;
  const payload = block[block.type];
  const mediaType = payload?.type;
  const media = mediaType && payload?.[mediaType] ? payload[mediaType] : null;
  const url = media?.url || "";
  if (!url) return null;
  return {
    blockType: block.type,
    payload,
    sourceType: mediaType,
    url,
    name: media?.name || "",
    caption: payload.caption || []
  };
}

function extensionFromName(name) {
  const extension = String(name || "").split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  return extension.length <= 8 ? extension : "";
}

function extensionFromMime(mime) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "application/pdf": "pdf"
  };
  return map[mime] || "";
}

function mimeFromExtension(extension) {
  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    avif: "image/avif",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/mp4",
    pdf: "application/pdf"
  };
  return map[String(extension || "").toLowerCase()] || "";
}

function mimeFromBuffer(buffer) {
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (buffer.length >= 8 && buffer.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))) return "image/gif";
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") return "video/mp4";
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return "video/webm";
  if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return "";
}

function objectKeyFromOssUrl(url) {
  const base = getOssConfig().publicBaseUrl.replace(/\/+$/g, "");
  if (!base || typeof url !== "string" || !url.startsWith(`${base}/`)) return "";
  return decodeURIComponent(url.slice(base.length + 1));
}

function isOssUrl(url) {
  return Boolean(objectKeyFromOssUrl(url));
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function loadAssetManifest(client) {
  try {
    const result = await client.get(getOssConfig().assetManifestKey);
    const source = Buffer.isBuffer(result.content) ? result.content.toString("utf8") : String(result.content || "{}");
    const parsed = JSON.parse(source);
    return {
      bySha256: parsed && typeof parsed.bySha256 === "object" && parsed.bySha256 ? parsed.bySha256 : {}
    };
  } catch {
    return { bySha256: {} };
  }
}

async function saveAssetManifest(client, manifest) {
  const body = Buffer.from(`${JSON.stringify({
    bySha256: manifest.bySha256,
    updatedAt: new Date().toISOString()
  }, null, 2)}\n`, "utf8");
  await withTimeout(client.put(getOssConfig().assetManifestKey, body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  }), "asset manifest upload");
}

async function withTimeout(promise, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ASSET_TIMEOUT_MS}ms`)), ASSET_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function retryAsync(fn, label, attempts = Number(process.env.NOTION_RETRY_ATTEMPTS || 8)) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.log(`[retry] ${label} attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }
  }
  throw new Error(`${label} failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 || unit === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`;
}

function shortUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname.slice(0, 80)}${parsed.pathname.length > 80 ? "..." : ""}`;
  } catch {
    return String(url || "").slice(0, 100);
  }
}

function normalizeLocalPath(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\u200b/g, "");
}

function normalizeFileStem(value) {
  return slugify(String(value || "").replace(/\.[^.]+$/, ""), "asset");
}

function mediaKindFromExtension(extension) {
  const ext = String(extension || "").toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (DOCUMENT_EXTENSIONS.has(ext)) return "document";
  return "";
}

function mediaKindFromBlockType(blockType) {
  if (blockType === "image") return "image";
  if (blockType === "video") return "video";
  if (blockType === "pdf") return "document";
  return "";
}

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function scanLocalAssetFolder(folderPath) {
  const normalizedFolder = normalizeLocalPath(folderPath);
  if (!normalizedFolder) return null;
  const resolvedFolder = path.resolve(normalizedFolder);
  if (!fs.existsSync(resolvedFolder) || !fs.statSync(resolvedFolder).isDirectory()) {
    console.log(`[local] folder not found ${normalizedFolder}`);
    return null;
  }

  const files = [];
  const stack = [resolvedFolder];
  while (stack.length && files.length < LOCAL_ASSET_MAX_FILES) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      console.log(`[local] cannot read ${current}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = extensionFromName(entry.name);
      const kind = mediaKindFromExtension(extension);
      if (!kind) continue;
      let size = 0;
      try {
        size = fs.statSync(fullPath).size;
      } catch {
        size = 0;
      }
      files.push({
        depth: path.relative(resolvedFolder, fullPath).split(path.sep).length - 1,
        fullPath,
        name: entry.name,
        extension,
        kind,
        size,
        stem: normalizeFileStem(entry.name)
      });
    }
  }

  files.sort((a, b) => a.depth - b.depth || naturalCompare(a.fullPath, b.fullPath));
  const byKind = new Map();
  const byStem = new Map();
  for (const file of files) {
    if (!byKind.has(file.kind)) byKind.set(file.kind, []);
    byKind.get(file.kind).push(file);
    if (!byStem.has(file.stem)) byStem.set(file.stem, []);
    byStem.get(file.stem).push(file);
  }

  console.log(`[local] indexed ${files.length} media files from ${resolvedFolder}`);
  return {
    folder: resolvedFolder,
    files,
    byKind,
    byStem,
    used: new Set()
  };
}

function localAssetIndexFromPage(page, tableConfig) {
  const names = tableConfig.localPathProperties || [];
  for (const propertyName of names) {
    const value = plainTextFromProperty(page.properties?.[propertyName]);
    if (!value) continue;
    const index = scanLocalAssetFolder(value);
    if (index) return index;
  }
  return null;
}

function candidateStemsFromMedia(media, blockId) {
  const stems = [];
  const values = [
    media.name,
    media.url,
    blockId
  ];
  for (const value of values.filter(Boolean)) {
    let source = String(value);
    try {
      const parsed = new URL(source);
      source = decodeURIComponent(path.basename(parsed.pathname));
    } catch {
      source = path.basename(source);
    }
    const stem = normalizeFileStem(source);
    if (stem && !GENERIC_LOCAL_MATCH_STEMS.has(stem) && !stems.includes(stem)) stems.push(stem);
    const parts = stem.split("-");
    for (let start = 1; start < parts.length; start += 1) {
      const suffix = parts.slice(start).join("-");
      if (suffix && !GENERIC_LOCAL_MATCH_STEMS.has(suffix) && !stems.includes(suffix)) stems.push(suffix);
    }
  }
  return stems;
}

function markLocalVariantsUsed(localIndex, file) {
  if (!localIndex || !file) return;
  const baseStem = normalizeFileStem(file.name).replace(/-(compressed|optimized)$/i, "");
  for (const candidate of localIndex.byKind.get(file.kind) || []) {
    const candidateStem = normalizeFileStem(candidate.name).replace(/-(compressed|optimized)$/i, "");
    if (candidateStem === baseStem) localIndex.used.add(candidate.fullPath);
  }
}

function matchLocalAsset(localIndex, media, blockId, mediaKind, sequenceByKind) {
  if (!localIndex || !mediaKind) return null;
  for (const stem of candidateStemsFromMedia(media, blockId)) {
    const candidates = localIndex.byStem.get(stem) || [];
    const match = candidates.find((file) => file.kind === mediaKind && !localIndex.used.has(file.fullPath));
    if (match) {
      markLocalVariantsUsed(localIndex, match);
      return { file: match, strategy: `name:${stem}` };
    }
  }

  const candidates = localIndex.byKind.get(mediaKind) || [];
  const sequence = sequenceByKind[mediaKind] || 0;
  const match = candidates.find((file) => !localIndex.used.has(file.fullPath) && !BODY_FALLBACK_EXCLUDED_STEMS.has(file.stem))
    || candidates.find((file) => !localIndex.used.has(file.fullPath));
  if (!match) return null;
  markLocalVariantsUsed(localIndex, match);
  return { file: match, strategy: `order:${sequence + 1}` };
}

async function ossObjectExists(client, objectKey) {
  if (!objectKey) return false;
  try {
    await withTimeout(client.head(objectKey), `oss head ${objectKey}`);
    return true;
  } catch {
    return false;
  }
}

async function downloadAsset(url, label = "asset") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASSET_TIMEOUT_MS);
  let response;
  try {
    response = await withTimeout(fetch(url, { signal: controller.signal }), "download headers");
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
  if (!response.ok) {
    clearTimeout(timeout);
    throw new Error(`download failed ${response.status}`);
  }
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE_SIZE) {
    clearTimeout(timeout);
    throw new Error(`file too large: ${Math.round(contentLength / 1024 / 1024)} MB`);
  }
  console.log(`[download] ${label} start ${contentLength ? formatBytes(contentLength) : "unknown size"} from ${shortUrl(url)}`);

  const chunks = [];
  let downloaded = 0;
  let lastProgressAt = Date.now();
  const startedAt = lastProgressAt;
  try {
    if (!response.body?.getReader) {
      const buffer = Buffer.from(await withTimeout(response.arrayBuffer(), "download body"));
      downloaded = buffer.length;
      chunks.push(buffer);
    } else {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        chunks.push(chunk);
        downloaded += chunk.length;
        if (downloaded > MAX_FILE_SIZE) {
          throw new Error(`file too large: ${Math.round(downloaded / 1024 / 1024)} MB`);
        }

        const now = Date.now();
        if (now - lastProgressAt >= ASSET_PROGRESS_MS) {
          const percent = contentLength ? ` ${Math.round(downloaded / contentLength * 100)}%` : "";
          const elapsed = Math.round((now - startedAt) / 1000);
          console.log(`[download] ${label} ${formatBytes(downloaded)}${contentLength ? `/${formatBytes(contentLength)}` : ""}${percent} elapsed=${elapsed}s`);
          lastProgressAt = now;
        }
      }
    }
  } catch (error) {
    throw new Error(`download body failed after ${formatBytes(downloaded)}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timeout);
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  const buffer = Buffer.concat(chunks);
  console.log(`[download] ${label} done ${formatBytes(buffer.length)} elapsed=${elapsed}s`);
  return {
    buffer,
    contentType: mimeFromBuffer(buffer) || response.headers.get("content-type")?.split(";")[0] || "application/octet-stream"
  };
}

function publicUrlForObject(objectKey) {
  return `${getOssConfig().publicBaseUrl.replace(/\/+$/g, "")}/${objectKey}`;
}

async function uploadBufferToOss(client, manifest, asset, objectBasePath, originalName, options = {}) {
  const { buffer, contentType } = asset;
  const sha256 = sha256Buffer(buffer);
  const existing = manifest.bySha256[sha256];
  const existingManifestObjectKey = existing?.url ? objectKeyFromOssUrl(existing.url) : "";
  const canReuseExisting = existing?.url
    && isOssUrl(existing.url)
    && (!options.rehomeOss || existingManifestObjectKey.startsWith(`${objectBasePath}/`))
    && await ossObjectExists(client, existingManifestObjectKey);
  if (canReuseExisting) {
    const reusedUrl = options.optimizeOnUpload && existing.optimizedUrl ? existing.optimizedUrl : existing.url;
    const reusedObjectKey = options.optimizeOnUpload && existing.optimizedObjectKey
      ? existing.optimizedObjectKey
      : existing.objectKey || objectKeyFromOssUrl(existing.url);
    return {
      url: reusedUrl,
      skipped: false,
      reused: true,
      objectKey: reusedObjectKey,
      originalObjectKey: existing.objectKey || objectKeyFromOssUrl(existing.url),
      sha256
    };
  }
  if (existingManifestObjectKey) {
    console.log(`[manifest] missing object ${existingManifestObjectKey}; replacing stale asset record`);
  }

  const extension = extensionFromMime(contentType) || extensionFromName(originalName) || "bin";
  const nameBase = slugify(String(originalName || "asset").replace(/\.[^.]+$/, ""), "asset");
  const objectKey = `${objectBasePath}/${Date.now()}-${randomBytes(4).toString("hex")}-${nameBase}.${extension}`;
  console.log(`[oss-upload] start ${objectKey} ${formatBytes(buffer.length)}`);
  await withTimeout(client.put(objectKey, buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  }), "oss upload");
  console.log(`[oss-upload] done ${objectKey}`);
  const publicUrl = publicUrlForObject(objectKey);
  let optimizedUrl = "";
  let optimizedObjectKey = "";
  let optimizedBytes = 0;
  if (options.optimizeOnUpload) {
    try {
      const optimized = await optimizeImageBuffer(buffer, contentType, options);
      if (optimized) {
        optimizedObjectKey = optimizedObjectKeyFor(objectKey);
        console.log(`[optimize] ${objectKey} ${formatBytes(buffer.length)} -> ${formatBytes(optimized.buffer.length)}`);
        await withTimeout(client.put(optimizedObjectKey, optimized.buffer, {
          headers: {
            "Content-Type": optimized.contentType,
            "Cache-Control": "public, max-age=31536000, immutable"
          }
        }), "optimized image upload");
        optimizedUrl = publicUrlForObject(optimizedObjectKey);
        optimizedBytes = optimized.buffer.length;
        console.log(`[optimize] done ${optimizedObjectKey}`);
      }
    } catch (error) {
      console.log(`[optimize] skipped ${objectKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  manifest.bySha256[sha256] = {
    url: publicUrl,
    objectKey,
    optimizedUrl,
    optimizedObjectKey,
    contentType,
    byteLength: buffer.length,
    optimizedByteLength: optimizedBytes,
    updatedAt: new Date().toISOString()
  };
  return {
    url: optimizedUrl || publicUrl,
    originalUrl: publicUrl,
    skipped: false,
    reused: false,
    objectKey: optimizedObjectKey || objectKey,
    originalObjectKey: objectKey,
    oldObjectKey: "",
    sha256
  };
}

async function uploadLocalFileToOss(client, manifest, localFile, objectBasePath, options = {}) {
  const buffer = fs.readFileSync(localFile.fullPath);
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`local file too large: ${formatBytes(buffer.length)}`);
  }
  const contentType = mimeFromBuffer(buffer) || mimeFromExtension(localFile.extension) || "application/octet-stream";
  console.log(`[local] upload ${localFile.fullPath} ${formatBytes(buffer.length)}`);
  return uploadBufferToOss(client, manifest, { buffer, contentType }, objectBasePath, localFile.name, options);
}

async function uploadUrlToOss(client, manifest, url, objectBasePath, originalName, options = {}) {
  const existingObjectKey = objectKeyFromOssUrl(url);
  if (existingObjectKey) {
    if (!options.rehomeOss || existingObjectKey.startsWith(`${objectBasePath}/`)) {
      return { url, skipped: true, objectKey: existingObjectKey };
    }
    console.log(`[rehome] ${existingObjectKey} -> ${objectBasePath}/`);
    const extension = extensionFromName(existingObjectKey) || extensionFromName(originalName) || "bin";
    const nameBase = slugify(String(originalName || path.basename(existingObjectKey) || "asset").replace(/\.[^.]+$/, ""), "asset");
    const objectKey = `${objectBasePath}/${Date.now()}-${randomBytes(4).toString("hex")}-${nameBase}.${extension}`;
    console.log(`[oss-copy] start ${existingObjectKey} -> ${objectKey}`);
    await withTimeout(client.copy(objectKey, existingObjectKey), "oss copy");
    console.log(`[oss-copy] done ${objectKey}`);
    return {
      url: publicUrlForObject(objectKey),
      skipped: false,
      reused: false,
      copied: true,
      objectKey,
      oldObjectKey: existingObjectKey
    };
  }

  const asset = await downloadAsset(url, `${path.basename(objectBasePath)}/${originalName || "asset"}`);
  return uploadBufferToOss(client, manifest, asset, objectBasePath, originalName, options);
}

async function deleteOldObjectKeys(client, objectKeys) {
  const uniqueKeys = Array.from(new Set(objectKeys.filter(Boolean)));
  if (!uniqueKeys.length) return 0;
  let deleted = 0;
  for (const objectKey of uniqueKeys) {
    try {
      await withTimeout(client.delete(objectKey), `delete ${objectKey}`);
      deleted += 1;
      console.log(`[delete] ${objectKey}`);
    } catch (error) {
      console.log(`[delete] failed ${objectKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return deleted;
}

async function listAllPages(notion, dataSourceId) {
  const pages = [];
  let startCursor;
  do {
    const response = await retryAsync(() => notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      result_type: "page",
      start_cursor: startCursor
    }), "notion data source query");
    pages.push(...response.results);
    startCursor = response.has_more ? response.next_cursor : undefined;
  } while (startCursor);
  return pages;
}

async function listChildren(notion, blockId) {
  const blocks = [];
  let startCursor;
  do {
    const response = await retryAsync(() => notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: startCursor
    }), "notion block children query");
    blocks.push(...response.results);
    startCursor = response.has_more ? response.next_cursor : undefined;
  } while (startCursor);
  return blocks;
}

async function processBlockTree(notion, client, manifest, pageId, tableFolder, itemFolder, itemLabel, stats, dryRun, options = {}) {
  const stack = await listChildren(notion, pageId);
  const localSequenceByKind = { image: 0, video: 0, document: 0 };
  while (stack.length) {
    if (stats.failedMedia >= MAX_FAILED_MEDIA_PER_ITEM) {
      console.log(`[body] ${itemLabel} skipped remaining media after ${stats.failedMedia} failures`);
      return;
    }

    const block = stack.shift();
    const media = mediaPayload(block);
    if (media && ["image", "video", "file", "pdf"].includes(media.blockType)) {
      stats.seen += 1;
      const originalName = `${media.blockType}-${block.id}`;
      const objectBasePath = ossPath(tableFolder, itemFolder, "notion-page-body");
      const mediaKind = mediaKindFromBlockType(media.blockType);
      console.log(`[body] ${itemLabel} media #${stats.seen} ${media.blockType}`);
      const existingObjectKey = objectKeyFromOssUrl(media.url);
      const isExpectedOssObject = isOssUrl(media.url) && (!options.rehomeOss || existingObjectKey.startsWith(`${objectBasePath}/`));
      if (isExpectedOssObject && await ossObjectExists(client, existingObjectKey)) {
        matchLocalAsset(options.localAssetIndex, media, block.id, mediaKind, localSequenceByKind);
        stats.skipped += 1;
        console.log(`[body] ${itemLabel} media #${stats.seen} skipped`);
      } else {
        if (isExpectedOssObject) {
          console.log(`[body] ${itemLabel} media #${stats.seen} missing OSS object; attempting recovery`);
        }
        const localMatch = matchLocalAsset(options.localAssetIndex, media, block.id, mediaKind, localSequenceByKind);
        if (localMatch) {
          console.log(`[local] matched ${itemLabel} media #${stats.seen} ${localMatch.strategy} -> ${localMatch.file.fullPath}`);
        }
        try {
          if (!dryRun) {
            const uploaded = localMatch
              ? await uploadLocalFileToOss(client, manifest, localMatch.file, objectBasePath, options)
              : existingObjectKey
                ? (() => {
                    throw new Error("missing OSS object has no local recovery source");
                  })()
              : await uploadUrlToOss(client, manifest, media.url, objectBasePath, originalName, options);
            const nextPayload = {
              external: { url: uploaded.url },
              caption: media.caption
            };
            await notion.blocks.update({
              block_id: block.id,
              [media.blockType]: nextPayload
            });
            if (uploaded.reused) {
              stats.reused += 1;
              console.log(`[body] ${itemLabel} media #${stats.seen} ${localMatch ? "local-reused" : "reused"}`);
            } else if (uploaded.copied) {
              stats.uploaded += 1;
              console.log(`[body] ${itemLabel} media #${stats.seen} copied`);
            } else {
              stats.uploaded += 1;
              console.log(`[body] ${itemLabel} media #${stats.seen} ${localMatch ? "local-uploaded" : "uploaded"}`);
            }
            if (uploaded.oldObjectKey) stats.oldObjectKeys.push(uploaded.oldObjectKey);
          } else {
            stats.uploaded += 1;
            console.log(`[body] ${itemLabel} media #${stats.seen} ${localMatch ? "would-upload-local" : "would-upload"}`);
          }
        } catch (error) {
          stats.failedMedia += 1;
          console.log(`[body] ${itemLabel} media #${stats.seen} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (mediaKind && mediaKind in localSequenceByKind) {
        localSequenceByKind[mediaKind] += 1;
      }
    }

    if (block.has_children) {
      stack.push(...await listChildren(notion, block.id));
    }
  }
}

function ossPath(tableFolder, itemFolder, segment) {
  const prefix = getOssConfig().uploadPrefix.replace(/^\/+|\/+$/g, "");
  return [prefix, "notion-sync", tableFolder, itemFolder].filter(Boolean).join("/");
}

async function processFilesProperty(client, manifest, page, tableConfig, itemFolder, propertyName, stats, dryRun, options = {}) {
  const property = page.properties?.[propertyName];
  const files = fileArrayFromProperty(property);
  if (!files.length) return null;

  const nextFiles = [];
  let changed = false;

  let fileIndex = 0;
  for (const file of files) {
    fileIndex += 1;
    const fileType = file.type;
    const sourceUrl = file?.[fileType]?.url || "";
    const fileName = file.name || `${propertyName}-asset`;
    if (!sourceUrl) continue;

    const objectBasePath = ossPath(tableConfig.tableFolder, itemFolder, slugify(propertyName, "files"));
    console.log(`[files] ${tableConfig.label} ${itemFolder} ${propertyName} ${fileIndex}/${files.length}`);
    const alreadyOss = isOssUrl(sourceUrl) && (!options.rehomeOss || objectKeyFromOssUrl(sourceUrl).startsWith(`${objectBasePath}/`));

    const upload = dryRun
      ? {
        url: sourceUrl,
        skipped: alreadyOss
      }
      : await uploadUrlToOss(
        client,
        manifest,
        sourceUrl,
        objectBasePath,
        fileName,
        options
      );

    if (upload.skipped) {
      stats.skipped += 1;
      console.log(`[files] ${tableConfig.label} ${itemFolder} ${propertyName} ${fileIndex}/${files.length} skipped`);
    } else if (dryRun) {
      stats.uploaded += 1;
      console.log(`[files] ${tableConfig.label} ${itemFolder} ${propertyName} ${fileIndex}/${files.length} would-upload`);
    } else if (upload.reused) {
      stats.reused += 1;
      changed = true;
      console.log(`[files] ${tableConfig.label} ${itemFolder} ${propertyName} ${fileIndex}/${files.length} reused`);
    } else if (upload.copied) {
      stats.uploaded += 1;
      changed = true;
      console.log(`[files] ${tableConfig.label} ${itemFolder} ${propertyName} ${fileIndex}/${files.length} copied`);
    } else {
      stats.uploaded += 1;
      changed = true;
      console.log(`[files] ${tableConfig.label} ${itemFolder} ${propertyName} ${fileIndex}/${files.length} uploaded`);
    }
    if (upload.oldObjectKey) stats.oldObjectKeys.push(upload.oldObjectKey);

    nextFiles.push({
      name: fileName,
      type: "external",
      external: { url: upload.url }
    });
  }

  if (!changed || dryRun) return null;
  return { [propertyName]: { files: nextFiles } };
}

function syncStatusUpdate(properties) {
  const property = properties?.[SYNC_STATUS_NAME];
  if (!property) return null;
  if (property.type === "status") return { [SYNC_STATUS_NAME]: { status: { name: SYNCED_STATUS } } };
  if (property.type === "select") return { [SYNC_STATUS_NAME]: { select: { name: SYNCED_STATUS } } };
  return null;
}

function syncStatusValue(page) {
  const property = page.properties?.[SYNC_STATUS_NAME];
  if (!property) return "";
  if (property.type === "status") return property.status?.name || "";
  if (property.type === "select") return property.select?.name || "";
  return "";
}

function publishProjectContent(slug) {
  if (!slug) throw new Error("Cannot publish project content without slug");
  console.log(`[publish-checkpoint] project ${slug} start`);
  const result = spawnSync(process.execPath, [
    "scripts/publish-oss-content.mjs",
    "--table=projects",
    `--slug=${slug}`
  ], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error(`project JSON publish failed for ${slug}`);
  }
  console.log(`[publish-checkpoint] project ${slug} done`);
}

function shouldProcessPending(page) {
  const status = syncStatusValue(page);
  return status === WAITING_SYNC_STATUS || status === WAITING_UPDATE_STATUS;
}

function shouldProcessPage(page, options = {}) {
  const status = syncStatusValue(page);
  if (status === EDITING_STATUS) return false;
  if (options.includeSynced) return true;
  return shouldProcessPending(page);
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function extensionFromUrl(url, fallback = "bin") {
  try {
    const parsed = new URL(url);
    return extensionFromName(parsed.pathname) || fallback;
  } catch {
    return fallback;
  }
}

function manualFileName(prefix, mediaType, blockOrIndex, url) {
  const extension = extensionFromUrl(url, mediaType === "video" ? "mp4" : mediaType === "image" ? "jpg" : "bin");
  return `${slugify(prefix, "media")}-${blockOrIndex}.${extension}`;
}

function isExpectedOssUrl(url, objectBasePath, options = {}) {
  if (!isOssUrl(url)) return false;
  return !options.rehomeOss || objectKeyFromOssUrl(url).startsWith(`${objectBasePath}/`);
}

async function collectMissingBlockMedia(notion, pageId, tableConfig, itemFolder, title, rows, options = {}) {
  const stack = await listChildren(notion, pageId);
  let mediaIndex = 0;
  while (stack.length) {
    const block = stack.shift();
    const media = mediaPayload(block);
    if (media && ["image", "video", "file", "pdf"].includes(media.blockType)) {
      mediaIndex += 1;
      const objectBasePath = ossPath(tableConfig.tableFolder, itemFolder, "notion-page-body");
      if (!isExpectedOssUrl(media.url, objectBasePath, options)) {
        rows.push({
          table: tableConfig.label,
          title,
          itemFolder,
          source: "notion-page-body",
          index: mediaIndex,
          type: media.blockType,
          blockId: block.id,
          targetFolder: objectBasePath,
          suggestedFileName: manualFileName(`${media.blockType}-${mediaIndex}`, media.blockType, block.id, media.url),
          url: media.url
        });
      }
    }
    if (block.has_children) {
      stack.push(...await listChildren(notion, block.id));
    }
  }
}

async function auditTable(tableKey, options = {}) {
  const tableConfig = tables[tableKey];
  if (!tableConfig) throw new Error(`Unknown table: ${tableKey}`);

  const dataSourceId = process.env[tableConfig.dataSourceEnv];
  if (!dataSourceId) throw new Error(`${tableConfig.dataSourceEnv} is missing`);

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const allPages = await listAllPages(notion, dataSourceId);
  const titleContains = String(options.titleContains || "").toLowerCase();
  const pages = allPages
    .filter((page) => syncStatusValue(page) !== EDITING_STATUS)
    .filter((page) => {
      if (!titleContains) return true;
      return titleFromProperty(page.properties?.[tableConfig.titleProperty]).toLowerCase().includes(titleContains);
    })
    .slice(0, options.limit || undefined);

  const rows = [];
  let index = 0;
  for (const page of pages) {
    index += 1;
    const title = titleFromProperty(page.properties?.[tableConfig.titleProperty]) || `row-${index}`;
    const slug = tableConfig.slugProperty ? richTextFromProperty(page.properties?.[tableConfig.slugProperty]) : "";
    const itemFolder = tableKey === "projects" ? slugify(slug || title || page.id, "project") : slugify(title || page.id, "item");
    console.log(`[audit] ${tableConfig.label} ${index}/${pages.length} ${title}`);

    for (const propertyName of tableConfig.fileProperties) {
      const files = fileArrayFromProperty(page.properties?.[propertyName]);
      let fileIndex = 0;
      for (const file of files) {
        fileIndex += 1;
        const fileType = file.type;
        const sourceUrl = file?.[fileType]?.url || "";
        if (!sourceUrl) continue;
        const objectBasePath = ossPath(tableConfig.tableFolder, itemFolder, slugify(propertyName, "files"));
        if (!isExpectedOssUrl(sourceUrl, objectBasePath, options)) {
          rows.push({
            table: tableConfig.label,
            title,
            itemFolder,
            source: propertyName,
            index: fileIndex,
            type: fileType || "file",
            blockId: "",
            targetFolder: objectBasePath,
            suggestedFileName: manualFileName(`${slugify(propertyName, "file")}-${fileIndex}`, fileType || "file", fileIndex, sourceUrl),
            url: sourceUrl
          });
        }
      }
    }

    if (tableConfig.includeBodyMedia && !options.skipBody) {
      await collectMissingBlockMedia(notion, page.id, tableConfig, itemFolder, title, rows, options);
    }
  }

  return rows;
}

function writeMissingReport(rows) {
  fs.mkdirSync(path.resolve("logs"), { recursive: true });
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
  const csvPath = path.resolve("logs", `missing-assets-${timestamp}.csv`);
  const jsonPath = path.resolve("logs", `missing-assets-${timestamp}.json`);
  const headers = ["table", "title", "itemFolder", "source", "index", "type", "blockId", "targetFolder", "suggestedFileName", "url"];
  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n");
  fs.writeFileSync(csvPath, `${csv}\n`, "utf8");
  fs.writeFileSync(jsonPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  return { csvPath, jsonPath };
}

async function runTable(tableKey, options = {}) {
  const tableConfig = tables[tableKey];
  if (!tableConfig) throw new Error(`Unknown table: ${tableKey}`);

  const dataSourceId = process.env[tableConfig.dataSourceEnv];
  if (!dataSourceId) throw new Error(`${tableConfig.dataSourceEnv} is missing`);

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const client = createOssClient();
  const manifest = await loadAssetManifest(client);
  let manifestChanged = false;
  const allPages = await listAllPages(notion, dataSourceId);
  const eligiblePages = allPages.filter((page) => shouldProcessPage(page, options));
  const titleContains = String(options.titleContains || "").toLowerCase();
  const filteredPages = titleContains
    ? eligiblePages.filter((page) => {
      const title = titleFromProperty(page.properties?.[tableConfig.titleProperty]).toLowerCase();
      return title.includes(titleContains);
    })
    : eligiblePages;
  const pages = options.limit ? filteredPages.slice(0, options.limit) : filteredPages;
  const skippedByStatus = allPages.length - eligiblePages.length;
  const totals = { rows: pages.length, skippedByStatus, uploaded: 0, reused: 0, skipped: 0, deletedOld: 0, updatedRows: 0, failedRows: 0 };

  console.log(`[${tableConfig.label}] rows=${pages.length} skippedByStatus=${skippedByStatus}${titleContains ? ` titleContains=${titleContains}` : ""}${options.limit ? ` limit=${options.limit}` : ""}`);

  let index = 0;
  for (const page of pages) {
    index += 1;
    const title = titleFromProperty(page.properties?.[tableConfig.titleProperty]) || `row-${index}`;
    const slug = tableConfig.slugProperty ? richTextFromProperty(page.properties?.[tableConfig.slugProperty]) : "";
    const itemFolder = tableKey === "projects" ? slugify(slug || title || page.id, "project") : slugify(title || page.id, "item");
    const stats = { uploaded: 0, reused: 0, skipped: 0, deletedOld: 0, seen: 0, failedMedia: 0, oldObjectKeys: [] };
    const fileProperties = {};

    console.log(`[${tableConfig.label}] ${index}/${pages.length} ${title} status=${syncStatusValue(page) || "empty"}`);

    try {
      for (const propertyName of tableConfig.fileProperties) {
        const update = await processFilesProperty(client, manifest, page, tableConfig, itemFolder, propertyName, stats, options.dryRun, options);
        if (update) Object.assign(fileProperties, update);
      }

      if (tableConfig.includeBodyMedia && !options.skipBody) {
        const localAssetIndex = localAssetIndexFromPage(page, tableConfig);
        await processBlockTree(notion, client, manifest, page.id, tableConfig.tableFolder, itemFolder, title, stats, options.dryRun, {
          ...options,
          localAssetIndex
        });
      }

      let rowUpdated = false;

      if (!options.dryRun && Object.keys(fileProperties).length > 0) {
        await notion.pages.update({ page_id: page.id, properties: fileProperties });
        rowUpdated = true;
      }

      if (
        !options.dryRun &&
        options.publishBeforeStatus &&
        tableKey === "projects" &&
        stats.failedMedia === 0
      ) {
        publishProjectContent(slug || itemFolder);
      }

      const statusUpdate = stats.failedMedia === 0 ? syncStatusUpdate(page.properties) : null;
      if (!options.dryRun && statusUpdate) {
        await notion.pages.update({ page_id: page.id, properties: statusUpdate });
        rowUpdated = true;
      }

      if (rowUpdated) totals.updatedRows += 1;
      if (stats.uploaded > 0 || stats.reused > 0) manifestChanged = true;
      if (!options.dryRun && options.deleteOldOss && stats.failedMedia === 0) {
        stats.deletedOld = await deleteOldObjectKeys(client, stats.oldObjectKeys);
      }

      totals.uploaded += stats.uploaded;
      totals.reused += stats.reused;
      totals.skipped += stats.skipped;
      totals.deletedOld += stats.deletedOld;
      console.log(`[${tableConfig.label}] done ${index}/${pages.length} uploaded=${stats.uploaded} reused=${stats.reused} skipped=${stats.skipped} deletedOld=${stats.deletedOld}`);
    } catch (error) {
      totals.failedRows += 1;
      console.log(`[${tableConfig.label}] failed ${index}/${pages.length} ${title}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!options.dryRun && manifestChanged) {
    await saveAssetManifest(client, manifest);
    console.log(`[${tableConfig.label}] asset manifest updated`);
  }

  console.log(`[${tableConfig.label}] summary ${JSON.stringify(totals)}`);
  return totals;
}

async function main() {
  loadEnv(ENV_PATH);
  configureProxyFromEnv();

  const missing = requiredEnv().filter(([, ok]) => !ok).map(([key]) => key);
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }

  const tableArg = process.argv.find((arg) => arg.startsWith("--table="))?.split("=")[1] || "all";
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || "";
  const limit = limitArg ? Math.max(0, Number(limitArg)) : 0;
  const dryRun = process.argv.includes("--dry-run");
  const skipBody = process.argv.includes("--skip-body");
  const includeSynced = process.argv.includes("--include-synced");
  const rehomeOss = process.argv.includes("--rehome-oss");
  const deleteOldOss = process.argv.includes("--delete-old-oss");
  const optimizeOnUpload = process.argv.includes("--optimize-on-upload");
  const publishBeforeStatus = process.argv.includes("--publish-before-status");
  const auditMissing = process.argv.includes("--audit-missing");
  const titleContains = process.argv.find((arg) => arg.startsWith("--title-contains="))?.split("=").slice(1).join("=") || "";
  const selected = tableArg === "all" ? Object.keys(tables) : [tableArg];

  if (auditMissing) {
    console.log(`audit missing start tables=${selected.join(", ")}${limit ? ` limit=${limit}` : ""}${skipBody ? " skipBody=true" : ""}${rehomeOss ? " rehomeOss=true" : ""}${titleContains ? ` titleContains=${titleContains}` : ""}`);
    const rows = [];
    for (const tableKey of selected) {
      rows.push(...await auditTable(tableKey, { limit, skipBody, rehomeOss, titleContains }));
    }
    for (const row of rows) {
      console.log(`[missing] ${row.table} | ${row.title} | ${row.source} #${row.index} ${row.type} -> ${row.targetFolder}/${row.suggestedFileName}`);
    }
    const report = writeMissingReport(rows);
    console.log(`audit missing complete count=${rows.length}`);
    console.log(`csv=${report.csvPath}`);
    console.log(`json=${report.jsonPath}`);
    return;
  }

  console.log(`sync start tables=${selected.join(", ")} dryRun=${dryRun}${limit ? ` limit=${limit}` : ""}${skipBody ? " skipBody=true" : ""}${includeSynced ? " includeSynced=true" : " statuses=待同步,待更新"}${rehomeOss ? " rehomeOss=true" : ""}${deleteOldOss ? " deleteOldOss=true" : ""}${optimizeOnUpload ? " optimizeOnUpload=true" : ""}${publishBeforeStatus ? " publishBeforeStatus=true" : ""}${titleContains ? ` titleContains=${titleContains}` : ""}`);

  const summary = {};
  for (const tableKey of selected) {
    summary[tableKey] = await runTable(tableKey, { dryRun, limit, skipBody, includeSynced, rehomeOss, deleteOldOss, optimizeOnUpload, publishBeforeStatus, titleContains });
  }

  console.log(`sync complete ${JSON.stringify(summary)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

