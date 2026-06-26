import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import OSS from "ali-oss";
import { Client } from "@notionhq/client";

const ENV_PATH = path.resolve(".env.local");
const SYNC_STATUS_NAME = String.fromCharCode(0x540c, 0x6b65, 0x72b6, 0x6001);
const SYNCED_STATUS = String.fromCharCode(0x5df2, 0x540c, 0x6b65);
const WAITING_SYNC_STATUS = String.fromCharCode(0x5f85, 0x540c, 0x6b65);
const WAITING_UPDATE_STATUS = String.fromCharCode(0x5f85, 0x66f4, 0x65b0);
const MAX_FILE_SIZE = 200 * 1024 * 1024;
const ASSET_TIMEOUT_MS = Number(process.env.ASSET_TIMEOUT_MS || 20000);
const MAX_FAILED_MEDIA_PER_ITEM = Number(process.env.MAX_FAILED_MEDIA_PER_ITEM || 3);

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
    uploadPrefix: envValue("ALIYUN_OSS_UPLOAD_PREFIX", "ALIYUN_OSS_DIR") || "uploads/admin"
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

function isDesiredOssUrl(url, objectBasePath) {
  const objectKey = objectKeyFromOssUrl(url);
  return Boolean(objectKey && objectKey.startsWith(`${objectBasePath}/`));
}

async function downloadAsset(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASSET_TIMEOUT_MS);
  let response;
  try {
    response = await withTimeout(fetch(url, { signal: controller.signal }), "download headers");
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`download failed ${response.status}`);
  }
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE_SIZE) {
    throw new Error(`file too large: ${Math.round(contentLength / 1024 / 1024)} MB`);
  }
  const buffer = Buffer.from(await withTimeout(response.arrayBuffer(), "download body"));
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`file too large: ${Math.round(buffer.length / 1024 / 1024)} MB`);
  }
  return {
    buffer,
    contentType: mimeFromBuffer(buffer) || response.headers.get("content-type")?.split(";")[0] || "application/octet-stream"
  };
}

function publicUrlForObject(objectKey) {
  return `${getOssConfig().publicBaseUrl.replace(/\/+$/g, "")}/${objectKey}`;
}

async function uploadUrlToOss(client, url, objectBasePath, originalName) {
  const existingObjectKey = objectKeyFromOssUrl(url);
  if (existingObjectKey && existingObjectKey.startsWith(`${objectBasePath}/`)) {
    return { url, skipped: true, objectKey: existingObjectKey };
  }

  const { buffer, contentType } = await downloadAsset(url);
  const extension = extensionFromMime(contentType) || extensionFromName(originalName) || "bin";
  const nameBase = slugify(String(originalName || "asset").replace(/\.[^.]+$/, ""), "asset");
  const objectKey = `${objectBasePath}/${Date.now()}-${randomBytes(4).toString("hex")}-${nameBase}.${extension}`;
  await withTimeout(client.put(objectKey, buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  }), "oss upload");
  return { url: publicUrlForObject(objectKey), skipped: false, objectKey };
}

async function listAllPages(notion, dataSourceId) {
  const pages = [];
  let startCursor;
  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      result_type: "page",
      start_cursor: startCursor
    });
    pages.push(...response.results);
    startCursor = response.has_more ? response.next_cursor : undefined;
  } while (startCursor);
  return pages;
}

async function listChildren(notion, blockId) {
  const blocks = [];
  let startCursor;
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: startCursor
    });
    blocks.push(...response.results);
    startCursor = response.has_more ? response.next_cursor : undefined;
  } while (startCursor);
  return blocks;
}

async function processBlockTree(notion, client, pageId, tableFolder, itemFolder, itemLabel, stats, dryRun) {
  const stack = await listChildren(notion, pageId);
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
      console.log(`[body] ${itemLabel} media #${stats.seen} ${media.blockType}`);
      if (isDesiredOssUrl(media.url, objectBasePath)) {
        stats.skipped += 1;
        console.log(`[body] ${itemLabel} media #${stats.seen} skipped`);
      } else {
        try {
          if (!dryRun) {
            const uploaded = await uploadUrlToOss(client, media.url, objectBasePath, originalName);
            const nextPayload = {
              external: { url: uploaded.url },
              caption: media.caption
            };
            await notion.blocks.update({
              block_id: block.id,
              [media.blockType]: nextPayload
            });
            stats.uploaded += 1;
            console.log(`[body] ${itemLabel} media #${stats.seen} uploaded`);
          } else {
            stats.uploaded += 1;
            console.log(`[body] ${itemLabel} media #${stats.seen} would-upload`);
          }
        } catch (error) {
          stats.failedMedia += 1;
          console.log(`[body] ${itemLabel} media #${stats.seen} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    if (block.has_children) {
      stack.push(...await listChildren(notion, block.id));
    }
  }
}

function ossPath(tableFolder, itemFolder, segment) {
  const prefix = getOssConfig().uploadPrefix.replace(/^\/+|\/+$/g, "");
  return [prefix, "notion-sync", itemFolder, segment].filter(Boolean).join("/");
}

async function processFilesProperty(client, page, tableConfig, itemFolder, propertyName, stats, dryRun) {
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
    const alreadyTargetOss = isDesiredOssUrl(sourceUrl, objectBasePath);
    if (stats.updateOnly && !alreadyTargetOss) {
      stats.failedMedia += 1;
      console.log(`[files] ${tableConfig.label} ${itemFolder} ${propertyName} ${fileIndex}/${files.length} update-only skipped: source is not target OSS URL`);
      nextFiles.push(file);
      continue;
    }

    const upload = dryRun
      ? {
        url: sourceUrl,
        skipped: alreadyTargetOss
      }
      : await uploadUrlToOss(
        client,
        sourceUrl,
        objectBasePath,
        fileName
      );

    if (upload.skipped) {
      stats.skipped += 1;
      console.log(`[files] ${tableConfig.label} ${itemFolder} ${propertyName} ${fileIndex}/${files.length} skipped`);
    } else {
      stats.uploaded += 1;
      changed = true;
      console.log(`[files] ${tableConfig.label} ${itemFolder} ${propertyName} ${fileIndex}/${files.length} uploaded`);
    }

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

function shouldProcessPending(page) {
  const status = syncStatusValue(page);
  return status === WAITING_SYNC_STATUS || status === WAITING_UPDATE_STATUS;
}

function isWaitingUpdate(page) {
  return syncStatusValue(page) === WAITING_UPDATE_STATUS;
}

async function runTable(tableKey, options = {}) {
  const tableConfig = tables[tableKey];
  if (!tableConfig) throw new Error(`Unknown table: ${tableKey}`);

  const dataSourceId = process.env[tableConfig.dataSourceEnv];
  if (!dataSourceId) throw new Error(`${tableConfig.dataSourceEnv} is missing`);

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const client = createOssClient();
  const allPages = await listAllPages(notion, dataSourceId);
  const eligiblePages = options.onlyPending ? allPages.filter(shouldProcessPending) : allPages;
  const pages = options.limit ? eligiblePages.slice(0, options.limit) : eligiblePages;
  const skippedByStatus = allPages.length - eligiblePages.length;
  const totals = { rows: pages.length, skippedByStatus, uploaded: 0, skipped: 0, updatedRows: 0, failedRows: 0 };

  console.log(`[${tableConfig.label}] rows=${pages.length}${options.onlyPending ? ` skippedByStatus=${skippedByStatus}` : ""}${options.limit ? ` limit=${options.limit}` : ""}`);

  let index = 0;
  for (const page of pages) {
    index += 1;
    const title = titleFromProperty(page.properties?.[tableConfig.titleProperty]) || `row-${index}`;
    const slug = tableConfig.slugProperty ? richTextFromProperty(page.properties?.[tableConfig.slugProperty]) : "";
    const itemFolder = tableKey === "projects" ? slugify(slug || title || page.id, "project") : slugify(title || page.id, "item");
    const updateOnly = isWaitingUpdate(page) && !options.forceUploadUpdates;
    const stats = { uploaded: 0, skipped: 0, seen: 0, failedMedia: 0, updateOnly };
    const fileProperties = {};

    console.log(`[${tableConfig.label}] ${index}/${pages.length} ${title}${updateOnly ? " update-only" : ""}`);

    try {
      for (const propertyName of tableConfig.fileProperties) {
        const update = await processFilesProperty(client, page, tableConfig, itemFolder, propertyName, stats, options.dryRun);
        if (update) Object.assign(fileProperties, update);
      }

      if (tableConfig.includeBodyMedia && !options.skipBody && !updateOnly) {
        await processBlockTree(notion, client, page.id, tableConfig.tableFolder, itemFolder, title, stats, options.dryRun);
      } else if (tableConfig.includeBodyMedia && !options.skipBody && updateOnly) {
        console.log(`[body] ${title} update-only skipped body media upload`);
      }

      let rowUpdated = false;

      if (!options.dryRun && Object.keys(fileProperties).length > 0) {
        await notion.pages.update({ page_id: page.id, properties: fileProperties });
        rowUpdated = true;
      }

      const statusUpdate = stats.failedMedia === 0 ? syncStatusUpdate(page.properties) : null;
      if (!options.dryRun && statusUpdate) {
        await notion.pages.update({ page_id: page.id, properties: statusUpdate });
        rowUpdated = true;
      }

      if (rowUpdated) totals.updatedRows += 1;

      totals.uploaded += stats.uploaded;
      totals.skipped += stats.skipped;
      console.log(`[${tableConfig.label}] done ${index}/${pages.length} uploaded=${stats.uploaded} skipped=${stats.skipped}`);
    } catch (error) {
      totals.failedRows += 1;
      console.log(`[${tableConfig.label}] failed ${index}/${pages.length} ${title}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`[${tableConfig.label}] summary ${JSON.stringify(totals)}`);
  return totals;
}

async function main() {
  loadEnv(ENV_PATH);

  const missing = requiredEnv().filter(([, ok]) => !ok).map(([key]) => key);
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }

  const tableArg = process.argv.find((arg) => arg.startsWith("--table="))?.split("=")[1] || "all";
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || "";
  const limit = limitArg ? Math.max(0, Number(limitArg)) : 0;
  const dryRun = process.argv.includes("--dry-run");
  const skipBody = process.argv.includes("--skip-body");
  const onlyPending = process.argv.includes("--only-pending");
  const forceUploadUpdates = process.argv.includes("--force-upload-updates");
  const selected = tableArg === "all" ? Object.keys(tables) : [tableArg];

  console.log(`sync start tables=${selected.join(", ")} dryRun=${dryRun}${limit ? ` limit=${limit}` : ""}${skipBody ? " skipBody=true" : ""}${onlyPending ? " onlyPending=true" : ""}${forceUploadUpdates ? " forceUploadUpdates=true" : ""}`);

  const summary = {};
  for (const tableKey of selected) {
    summary[tableKey] = await runTable(tableKey, { dryRun, limit, skipBody, onlyPending, forceUploadUpdates });
  }

  console.log(`sync complete ${JSON.stringify(summary)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

