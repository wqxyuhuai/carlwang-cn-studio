import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ENV_PATH = path.resolve(".env.local");
const DEFAULT_CONTENT_URL = "https://carlwang-cn-studio.oss-cn-shanghai.aliyuncs.com/uploads/admin/site-content.json";
const MAX_REPAIR_BYTES = Number(process.env.OSS_REPAIR_MAX_BYTES || 30 * 1024 * 1024);

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
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
    publicBaseUrl: envValue("ALIYUN_OSS_PUBLIC_BASE_URL")
  };
}

function requireOssConfig(config) {
  const missing = [];
  if (!config.accessKeyId) missing.push("ALIYUN_ACCESS_KEY_ID");
  if (!config.accessKeySecret) missing.push("ALIYUN_ACCESS_KEY_SECRET");
  if (!config.bucket) missing.push("ALIYUN_OSS_BUCKET");
  if (!config.publicBaseUrl) missing.push("ALIYUN_OSS_PUBLIC_BASE_URL");
  if (!config.region && !config.endpoint) missing.push("ALIYUN_OSS_REGION or ALIYUN_OSS_ENDPOINT");
  if (missing.length) throw new Error(`Missing OSS config: ${missing.join(", ")}`);
}

function ossEndpointHost(config) {
  const rawEndpoint = config.endpoint || `${config.region}.aliyuncs.com`;
  return rawEndpoint.replace(/^https?:\/\//, "").replace(/\/+$/g, "");
}

function ossObjectUrl(config, objectKey) {
  const host = ossEndpointHost(config);
  const encodedKey = objectKey.split("/").map(encodeURIComponent).join("/");
  return `https://${config.bucket}.${host}/${encodedKey}`;
}

function targetFromOssUrl(config, url) {
  const parsed = new URL(url);
  const base = config.publicBaseUrl.replace(/\/+$/g, "");
  if (url.startsWith(`${base}/`)) {
    return { config, objectKey: decodeURIComponent(url.slice(base.length + 1)) };
  }

  const match = parsed.hostname.match(/^([^.]+)\.(oss-[^.]+\.aliyuncs\.com)$/);
  if (!match) return null;
  return {
    config: {
      ...config,
      bucket: match[1],
      endpoint: `https://${match[2]}`,
      publicBaseUrl: `${parsed.protocol}//${parsed.hostname}`
    },
    objectKey: decodeURIComponent(parsed.pathname.replace(/^\/+/, ""))
  };
}

function ossAuthorization(config, method, objectKey, contentType, date) {
  const canonicalResource = `/${config.bucket}/${objectKey}`;
  const stringToSign = `${method}\n\n${contentType}\n${date}\n${canonicalResource}`;
  const signature = createHmac("sha1", config.accessKeySecret).update(stringToSign).digest("base64");
  return `OSS ${config.accessKeyId}:${signature}`;
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
  return "application/octet-stream";
}

function collectUrls(value, urls = new Set()) {
  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) urls.add(value);
    return urls;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, urls);
    return urls;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectUrls(item, urls);
  }
  return urls;
}

async function putObject(config, objectKey, buffer, contentType) {
  const date = new Date().toUTCString();
  const response = await fetch(ossObjectUrl(config, objectKey), {
    method: "PUT",
    headers: {
      Authorization: ossAuthorization(config, "PUT", objectKey, contentType, date),
      Date: date,
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable"
    },
    body: buffer
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`PUT failed ${response.status}: ${detail.slice(0, 300)}`);
  }
}

loadEnv(ENV_PATH);
const config = getOssConfig();
requireOssConfig(config);

const contentUrl = process.env.NEXT_PUBLIC_CONTENT_URL || DEFAULT_CONTENT_URL;
const content = await fetch(contentUrl).then((response) => {
  if (!response.ok) throw new Error(`Content JSON failed ${response.status}`);
  return response.json();
});

const urls = [...collectUrls(content)]
  .filter((url) => targetFromOssUrl(config, url))
  .filter((url) => /\.(avif|gif|jpe?g|png|svg|webp)(\?|$)/i.test(url));

let repaired = 0;
let skipped = 0;

for (const url of urls) {
  const target = targetFromOssUrl(config, url);
  const objectKey = target.objectKey;
  const head = await fetch(url, { method: "HEAD" });
  const length = Number(head.headers.get("content-length") || 0);
  const currentType = head.headers.get("content-type")?.split(";")[0] || "";
  const disposition = head.headers.get("content-disposition") || "";

  if (length > MAX_REPAIR_BYTES) {
    skipped += 1;
    console.log(`[skip:size] ${objectKey} ${length}`);
    continue;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET failed ${response.status}: ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const detectedType = mimeFromBuffer(buffer);
  const needsRepair = detectedType !== currentType || /attachment/i.test(disposition);

  if (!needsRepair) {
    skipped += 1;
    console.log(`[skip:ok] ${objectKey}`);
    continue;
  }

  await putObject(target.config, objectKey, buffer, detectedType);
  repaired += 1;
  console.log(`[repair] ${objectKey} ${currentType || "unknown"} -> ${detectedType}`);
}

console.log(`Done. repaired=${repaired} skipped=${skipped}`);
