import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import OSS from "ali-oss";
import { Client } from "@notionhq/client";
import { optimizedObjectKeyFor } from "./lib/asset-optimizer.mjs";
import { configureProxyFromEnv } from "./lib/proxy.mjs";

const ENV_PATH = path.resolve(".env.local");
const DEFAULT_CONTENT_KEY = "uploads/admin/site-content.json";
const MEDIA_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".mov", ".m4v"]);

const tableEnvs = [
  "NOTION_WORK_TYPES_DATABASE_ID",
  "NOTION_WORKS_DATABASE_ID",
  "NOTION_TOOLS_DATABASE_ID",
  "NOTION_SOCIAL_LINKS_DATABASE_ID",
  "NOTION_ABOUT_EXPERIENCE_DATABASE_ID"
];

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
    uploadPrefix: envValue("ALIYUN_OSS_UPLOAD_PREFIX", "ALIYUN_OSS_DIR") || "uploads/admin",
    contentKey: envValue("ALIYUN_OSS_CONTENT_KEY") || DEFAULT_CONTENT_KEY
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

function objectKeyFromOssUrl(url) {
  const base = getOssConfig().publicBaseUrl.replace(/\/+$/g, "");
  if (!base || typeof url !== "string" || !url.startsWith(`${base}/`)) return "";
  return decodeURIComponent(url.slice(base.length + 1));
}

function optimizedVideoObjectKeyFor(objectKey) {
  const directory = path.posix.dirname(objectKey);
  const extension = path.posix.extname(objectKey);
  const baseName = path.posix.basename(objectKey, extension).replace(/-optimized$/i, "");
  return `${directory}/${baseName}-optimized.mp4`;
}

function optimizedCounterpartFor(objectKey) {
  const extension = path.posix.extname(objectKey).toLowerCase();
  if ([".mp4", ".webm", ".mov", ".m4v"].includes(extension)) return optimizedVideoObjectKeyFor(objectKey);
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(extension)) return optimizedObjectKeyFor(objectKey);
  return "";
}

function isMediaObject(objectKey) {
  return MEDIA_EXTENSIONS.has(path.posix.extname(objectKey).toLowerCase());
}

function isOptimizedObject(objectKey) {
  const lower = objectKey.toLowerCase();
  return lower.endsWith("-optimized.webp") || lower.endsWith("-optimized.mp4");
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

async function retryAsync(fn, label, attempts = 8) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.log(`[retry] ${label} attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
      }
    }
  }
  throw new Error(`${label} failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function getJsonObject(client, objectKey) {
  const result = await client.get(objectKey);
  const text = Buffer.isBuffer(result.content) ? result.content.toString("utf8") : String(result.content || "{}");
  return JSON.parse(text);
}

function collectOssRefs(value, refs = new Set()) {
  if (typeof value === "string") {
    const objectKey = objectKeyFromOssUrl(value);
    if (objectKey) refs.add(objectKey);
    return refs;
  }
  if (!value || typeof value !== "object") return refs;
  if (Array.isArray(value)) {
    for (const item of value) collectOssRefs(item, refs);
    return refs;
  }
  for (const child of Object.values(value)) collectOssRefs(child, refs);
  return refs;
}

function collectPagePropertyRefs(page, refs) {
  for (const property of Object.values(page.properties || {})) {
    if (property?.type === "files" && Array.isArray(property.files)) {
      for (const file of property.files) {
        const url = file?.file?.url || file?.external?.url || "";
        const objectKey = objectKeyFromOssUrl(url);
        if (objectKey) refs.add(objectKey);
      }
    }
  }
}

function mediaPayload(block) {
  if (!block?.type || !block[block.type]) return null;
  const payload = block[block.type];
  const mediaType = payload?.type;
  const media = mediaType && payload?.[mediaType] ? payload[mediaType] : null;
  return media?.url || "";
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

async function collectPageBodyRefs(notion, pageId, refs) {
  const stack = await listChildren(notion, pageId);
  while (stack.length) {
    const block = stack.shift();
    const url = mediaPayload(block);
    const objectKey = objectKeyFromOssUrl(url);
    if (objectKey) refs.add(objectKey);
    if (block.has_children) {
      stack.push(...await listChildren(notion, block.id));
    }
  }
}

async function collectNotionRefs() {
  const refs = new Set();
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  for (const envName of tableEnvs) {
    const dataSourceId = process.env[envName];
    if (!dataSourceId) continue;
    const pages = await listAllPages(notion, dataSourceId);
    console.log(`[notion] ${envName} pages=${pages.length}`);
    for (const page of pages) {
      collectPagePropertyRefs(page, refs);
      if (envName === "NOTION_WORKS_DATABASE_ID") {
        await collectPageBodyRefs(notion, page.id, refs);
      }
    }
  }
  return refs;
}

async function collectPublicRefs(client) {
  const refs = new Set();
  const site = await getJsonObject(client, getOssConfig().contentKey);
  collectOssRefs(site, refs);
  const contentKeys = Array.from(refs).filter((key) => key.includes("/studio-projects/") && key.endsWith("/content.json"));
  for (const key of contentKeys) {
    try {
      collectOssRefs(await getJsonObject(client, key), refs);
    } catch (error) {
      console.log(`[public] failed ${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return refs;
}

async function listAllOssObjects(client) {
  const prefix = `${getOssConfig().uploadPrefix.replace(/^\/+|\/+$/g, "")}/notion-sync/`;
  const objects = [];
  let marker;
  do {
    const response = await client.list({ prefix, marker, "max-keys": 1000 });
    objects.push(...(response.objects || []));
    marker = response.nextMarker;
  } while (marker);
  return objects;
}

function writeReport(report) {
  fs.mkdirSync("logs", { recursive: true });
  const reportPath = path.resolve("logs", `oss-delete-unused-originals-${timestamp()}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}

async function main() {
  loadEnv(ENV_PATH);
  configureProxyFromEnv();
  const missing = requiredEnv().filter(([, ok]) => !ok).map(([name]) => name);
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`);

  const deleteMode = hasArg("delete");
  const client = createOssClient();
  const publicRefs = await collectPublicRefs(client);
  console.log(`[public] refs=${publicRefs.size}`);
  const notionRefs = await collectNotionRefs();
  console.log(`[notion] oss refs=${notionRefs.size}`);
  const protectedRefs = new Set([...publicRefs, ...notionRefs]);

  const objects = await listAllOssObjects(client);
  const objectMap = new Map(objects.map((object) => [object.name, object]));
  const candidates = [];
  const protectedOriginals = [];

  for (const object of objects) {
    const objectKey = object.name;
    if (!isMediaObject(objectKey) || isOptimizedObject(objectKey)) continue;
    const optimizedObjectKey = optimizedCounterpartFor(objectKey);
    if (!optimizedObjectKey || !objectMap.has(optimizedObjectKey)) continue;
    if (protectedRefs.has(objectKey)) {
      protectedOriginals.push({
        objectKey,
        size: Number(object.size || 0),
        reason: publicRefs.has(objectKey) ? "public" : "notion"
      });
      continue;
    }
    candidates.push({
      objectKey,
      optimizedObjectKey,
      size: Number(object.size || 0)
    });
  }

  let deleted = 0;
  let deletedBytes = 0;
  for (const candidate of candidates) {
    if (deleteMode) {
      await client.delete(candidate.objectKey);
      deleted += 1;
      deletedBytes += candidate.size;
      console.log(`[delete] ${candidate.objectKey} ${formatBytes(candidate.size)}`);
    } else {
      console.log(`[dry-run] ${candidate.objectKey} ${formatBytes(candidate.size)}`);
    }
  }

  const report = {
    mode: deleteMode ? "delete" : "dry-run",
    publicRefs: publicRefs.size,
    notionRefs: notionRefs.size,
    totalObjects: objects.length,
    candidates,
    protectedOriginals,
    summary: {
      candidates: candidates.length,
      candidateBytes: candidates.reduce((total, item) => total + item.size, 0),
      protectedOriginals: protectedOriginals.length,
      protectedBytes: protectedOriginals.reduce((total, item) => total + item.size, 0),
      deleted,
      deletedBytes
    }
  };
  const reportPath = writeReport(report);
  console.log(`[cleanup] report ${reportPath}`);
  console.log(`[cleanup] summary ${JSON.stringify({
    ...report.summary,
    candidateSize: formatBytes(report.summary.candidateBytes),
    protectedSize: formatBytes(report.summary.protectedBytes),
    deletedSize: formatBytes(report.summary.deletedBytes)
  })}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
