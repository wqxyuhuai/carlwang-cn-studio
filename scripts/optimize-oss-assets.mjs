import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import OSS from "ali-oss";
import {
  looksLikeImageObjectKey,
  optimizeImageBuffer,
  optimizedObjectKeyFor,
  shouldSkipImageOptimization
} from "./lib/asset-optimizer.mjs";

const ENV_PATH = path.resolve(".env.local");
const DEFAULT_CONTENT_KEY = "uploads/admin/site-content.json";
const OSS_OPERATION_TIMEOUT_MS = Number(process.env.OSS_OPERATION_TIMEOUT_MS || 30000);

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

function argValue(name) {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`))?.split("=").slice(1).join("=") || "";
  if (arg) return arg;
  return process.env[`npm_config_${name.replace(/-/g, "_")}`] || "";
}

function hasArg(name) {
  if (process.argv.includes(`--${name}`)) return true;
  const value = process.env[`npm_config_${name.replace(/-/g, "_")}`];
  return value === "true" || value === "1";
}

function getOssConfig() {
  return {
    accessKeyId: envValue("ALIYUN_OSS_ACCESS_KEY_ID", "ALIYUN_ACCESS_KEY_ID"),
    accessKeySecret: envValue("ALIYUN_OSS_ACCESS_KEY_SECRET", "ALIYUN_ACCESS_KEY_SECRET"),
    region: envValue("ALIYUN_OSS_REGION"),
    endpoint: envValue("ALIYUN_OSS_ENDPOINT"),
    bucket: envValue("ALIYUN_OSS_BUCKET"),
    publicBaseUrl: envValue("ALIYUN_OSS_PUBLIC_BASE_URL"),
    contentKey: envValue("ALIYUN_OSS_CONTENT_KEY") || DEFAULT_CONTENT_KEY
  };
}

function requiredEnv() {
  const oss = getOssConfig();
  return [
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

function publicUrlForObject(objectKey) {
  return `${getOssConfig().publicBaseUrl.replace(/\/+$/g, "")}/${objectKey}`;
}

function objectKeyFromOssUrl(url) {
  const base = getOssConfig().publicBaseUrl.replace(/\/+$/g, "");
  if (!base || typeof url !== "string" || !url.startsWith(`${base}/`)) return "";
  return decodeURIComponent(url.slice(base.length + 1));
}

function mimeFromBuffer(buffer) {
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (buffer.length >= 8 && buffer.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))) return "image/gif";
  return "";
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

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function getJsonObject(client, objectKey) {
  console.log(`[content] read ${objectKey}`);
  const result = await withTimeout(client.get(objectKey), `read ${objectKey}`);
  const text = Buffer.isBuffer(result.content) ? result.content.toString("utf8") : String(result.content || "{}");
  return JSON.parse(text);
}

async function putJsonObject(client, objectKey, value, dryRun) {
  if (dryRun) return;
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  await withTimeout(client.put(objectKey, body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  }), `write ${objectKey}`);
}

async function objectExists(client, objectKey) {
  try {
    await withTimeout(client.head(objectKey), `head ${objectKey}`);
    return true;
  } catch {
    return false;
  }
}

async function withTimeout(promise, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${OSS_OPERATION_TIMEOUT_MS}ms`)), OSS_OPERATION_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function collectOssUrlRefs(root, label, markChanged) {
  const refs = [];
  const seen = new WeakSet();

  function walk(value, trail, parent, key) {
    if (typeof value === "string") {
      const objectKey = objectKeyFromOssUrl(value);
      if (objectKey) {
        refs.push({
          label: `${label}${trail ? `.${trail}` : ""}`,
          url: value,
          objectKey,
          set(nextUrl) {
            parent[key] = nextUrl;
            markChanged();
          }
        });
      }
      return;
    }

    if (!value || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${trail}[${index}]`, value, index));
      return;
    }

    for (const [childKey, childValue] of Object.entries(value)) {
      walk(childValue, trail ? `${trail}.${childKey}` : childKey, value, childKey);
    }
  }

  walk(root, "", null, "");
  return refs;
}

function isProjectContentUrl(url) {
  const objectKey = objectKeyFromOssUrl(url);
  return Boolean(objectKey && objectKey.endsWith("/content.json") && objectKey.includes("/studio-projects/"));
}

function candidateCount(refs, options = {}) {
  return refs.filter((ref) => !shouldSkipImageOptimization(ref.objectKey, options) && looksLikeImageObjectKey(ref.objectKey)).length;
}

async function optimizeOssImage(client, ref, options, cache) {
  if (cache.has(ref.url)) return cache.get(ref.url);

  const skipped = (reason) => {
    const result = { nextUrl: ref.url, action: "skipped", reason };
    cache.set(ref.url, result);
    return result;
  };

  if (shouldSkipImageOptimization(ref.objectKey, options)) return skipped("already optimized or svg");
  if (!looksLikeImageObjectKey(ref.objectKey)) return skipped("not an image path");

  const optimizedObjectKey = optimizedObjectKeyFor(ref.objectKey);
  const optimizedUrl = publicUrlForObject(optimizedObjectKey);
  if (!options.force && await objectExists(client, optimizedObjectKey)) {
    const result = { nextUrl: optimizedUrl, action: "reused", optimizedObjectKey };
    cache.set(ref.url, result);
    return result;
  }

  const result = await withTimeout(client.get(ref.objectKey), `read ${ref.objectKey}`);
  const buffer = Buffer.isBuffer(result.content) ? result.content : Buffer.from(result.content || "");
  const contentType = mimeFromBuffer(buffer);
  if (!contentType) return skipped("unsupported image bytes");

  const optimized = await optimizeImageBuffer(buffer, contentType, options);
  if (!optimized) return skipped("saving below threshold");

  if (!options.dryRun) {
    await withTimeout(client.put(optimizedObjectKey, optimized.buffer, {
      headers: {
        "Content-Type": optimized.contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    }), `write ${optimizedObjectKey}`);
  }

  const finalResult = {
    nextUrl: optimizedUrl,
    action: options.dryRun ? "would-optimize" : "optimized",
    optimizedObjectKey,
    originalBytes: optimized.originalBytes,
    optimizedBytes: optimized.optimizedBytes,
    savingRatio: optimized.savingRatio
  };
  cache.set(ref.url, finalResult);
  return finalResult;
}

function writeReport(report) {
  fs.mkdirSync("logs", { recursive: true });
  const reportPath = path.resolve("logs", `asset-optimization-${timestamp()}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}

async function main() {
  loadEnv(ENV_PATH);
  const missing = requiredEnv().filter(([, ok]) => !ok).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }

  const options = {
    dryRun: hasArg("dry-run"),
    force: hasArg("force"),
    quality: Number(argValue("quality") || process.env.OPTIMIZE_WEBP_QUALITY || 80),
    gifQuality: Number(argValue("gif-quality") || process.env.OPTIMIZE_GIF_WEBP_QUALITY || 55),
    maxWidth: Number(argValue("max-width") || process.env.OPTIMIZE_MAX_WIDTH || 1366),
    maxHeight: Number(argValue("max-height") || process.env.OPTIMIZE_MAX_HEIGHT || 768),
    minSavingRatio: Number(argValue("min-saving-ratio") || process.env.OPTIMIZE_MIN_SAVING_RATIO || 0.05),
    gifMinSavingRatio: Number(argValue("gif-min-saving-ratio") || process.env.OPTIMIZE_GIF_MIN_SAVING_RATIO || 0),
    includeOptimized: hasArg("include-optimized"),
    limit: Number(argValue("limit") || 0)
  };

  const client = createOssClient();
  const contentKey = getOssConfig().contentKey;
  const siteContent = await getJsonObject(client, contentKey);
  let siteChanged = false;
  const siteRefs = collectOssUrlRefs(siteContent, "site", () => {
    siteChanged = true;
  });

  const projectDocs = [];
  let discoveredCandidates = candidateCount(siteRefs, options);
  for (const work of Array.isArray(siteContent.works) ? siteContent.works : []) {
    if (options.limit && discoveredCandidates >= options.limit) {
      console.log(`[content] limit satisfied by discovered refs (${discoveredCandidates})`);
      break;
    }
    if (!isProjectContentUrl(work.contentUrl)) continue;
    const objectKey = objectKeyFromOssUrl(work.contentUrl);
    try {
      const document = { key: objectKey, slug: work.slug || objectKey, json: await getJsonObject(client, objectKey), changed: false };
      document.refs = collectOssUrlRefs(document.json, `project:${document.slug}`, () => {
        document.changed = true;
      });
      discoveredCandidates += candidateCount(document.refs, options);
      projectDocs.push(document);
    } catch (error) {
      console.log(`[content] skipped ${objectKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const refs = [
    ...siteRefs.filter((ref) => !isProjectContentUrl(ref.url)),
    ...projectDocs.flatMap((document) => document.refs)
  ];

  console.log(`[optimize] refs=${refs.length} dryRun=${options.dryRun} quality=${options.quality} maxWidth=${options.maxWidth} maxHeight=${options.maxHeight} includeOptimized=${options.includeOptimized}`);
  const cache = new Map();
  const report = {
    options,
    contentKey,
    startedAt: new Date().toISOString(),
    rows: []
  };

  let attempted = 0;
  for (let index = 0; index < refs.length; index += 1) {
    const ref = refs[index];
    if (options.limit && attempted >= options.limit) {
      console.log(`[optimize] limit reached ${options.limit}`);
      break;
    }

    if (shouldSkipImageOptimization(ref.objectKey, options) || !looksLikeImageObjectKey(ref.objectKey)) {
      continue;
    }

    attempted += 1;
    try {
      const result = await optimizeOssImage(client, ref, options, cache);
      if (result.nextUrl !== ref.url) ref.set(result.nextUrl);
      report.rows.push({
        label: ref.label,
        objectKey: ref.objectKey,
        action: result.action,
        reason: result.reason || "",
        optimizedObjectKey: result.optimizedObjectKey || "",
        originalBytes: result.originalBytes || 0,
        optimizedBytes: result.optimizedBytes || 0,
        savingRatio: result.savingRatio || 0
      });
      const bytes = result.originalBytes ? ` ${formatBytes(result.originalBytes)} -> ${formatBytes(result.optimizedBytes)}` : "";
      console.log(`[optimize] ${attempted}/${options.limit || "all"} ${result.action} ${ref.objectKey}${bytes}`);
    } catch (error) {
      report.rows.push({
        label: ref.label,
        objectKey: ref.objectKey,
        action: "failed",
        reason: error instanceof Error ? error.message : String(error)
      });
      console.log(`[optimize] failed ${ref.objectKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const document of projectDocs) {
    if (!document.changed) continue;
    await putJsonObject(client, document.key, document.json, options.dryRun);
    console.log(`[content] ${options.dryRun ? "would update" : "updated"} ${document.key}`);
  }

  if (siteChanged) {
    await putJsonObject(client, contentKey, siteContent, options.dryRun);
    console.log(`[content] ${options.dryRun ? "would update" : "updated"} ${contentKey}`);
  }

  report.finishedAt = new Date().toISOString();
  report.summary = report.rows.reduce((summary, row) => {
    summary[row.action] = (summary[row.action] || 0) + 1;
    summary.originalBytes += row.originalBytes || 0;
    summary.optimizedBytes += row.optimizedBytes || 0;
    return summary;
  }, { originalBytes: 0, optimizedBytes: 0 });
  report.summary.savedBytes = report.summary.originalBytes - report.summary.optimizedBytes;

  const reportPath = writeReport(report);
  console.log(`[optimize] report ${reportPath}`);
  console.log(`[optimize] summary ${JSON.stringify(report.summary)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
