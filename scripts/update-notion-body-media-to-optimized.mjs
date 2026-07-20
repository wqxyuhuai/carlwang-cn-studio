import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import OSS from "ali-oss";
import { Client } from "@notionhq/client";
import { looksLikeImageObjectKey, optimizedObjectKeyFor } from "./lib/asset-optimizer.mjs";
import { configureProxyFromEnv } from "./lib/proxy.mjs";

const ENV_PATH = path.resolve(".env.local");
const SYNC_STATUS_NAME = String.fromCharCode(0x540c, 0x6b65, 0x72b6, 0x6001);

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

function argValue(name) {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`))?.split("=").slice(1).join("=") || "";
  if (arg) return arg;
  return process.env[`npm_config_${name.replace(/-/g, "_")}`] || "";
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

function requiredEnv() {
  const oss = getOssConfig();
  return [
    ["NOTION_TOKEN", Boolean(process.env.NOTION_TOKEN)],
    ["NOTION_WORKS_DATABASE_ID", Boolean(process.env.NOTION_WORKS_DATABASE_ID)],
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

function optimizedVideoObjectKeyFor(objectKey) {
  const directory = path.posix.dirname(objectKey);
  const extension = path.posix.extname(objectKey);
  const baseName = path.posix.basename(objectKey, extension).replace(/-optimized$/i, "");
  return `${directory}/${baseName}-optimized.mp4`;
}

function looksLikeVideoObjectKey(objectKey = "") {
  return [".mp4", ".webm", ".mov", ".m4v"].includes(path.posix.extname(objectKey.split("?")[0]).toLowerCase());
}

function textFromRichText(value) {
  if (!Array.isArray(value)) return "";
  return value.map((part) => part?.plain_text || "").join("");
}

function titleFromPage(page) {
  for (const property of Object.values(page.properties || {})) {
    if (property?.type === "title") return textFromRichText(property.title);
  }
  return page.id;
}

function slugFromPage(page) {
  const property = page.properties?.Slug;
  if (property?.type !== "rich_text") return "";
  return textFromRichText(property.rich_text);
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

async function objectExists(client, objectKey) {
  try {
    await client.head(objectKey);
    return true;
  } catch {
    return false;
  }
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

async function updatePageBody(notion, ossClient, page, options) {
  const title = titleFromPage(page);
  const stack = await listChildren(notion, page.id);
  const stats = {
    title,
    seenMedia: 0,
    updated: 0,
    alreadyOptimized: 0,
    missingOptimized: 0,
    nonOss: 0,
    skippedUnsupported: 0
  };

  while (stack.length) {
    const block = stack.shift();
    const media = mediaPayload(block);

    if (media) {
      stats.seenMedia += 1;
      const objectKey = objectKeyFromOssUrl(media.url);
      if (!objectKey) {
        stats.nonOss += 1;
      } else if (objectKey.endsWith("-optimized.webp")) {
        stats.alreadyOptimized += 1;
      } else if (objectKey.endsWith("-optimized.mp4")) {
        stats.alreadyOptimized += 1;
      } else {
        const optimizedObjectKey = media.blockType === "image" && looksLikeImageObjectKey(objectKey)
          ? optimizedObjectKeyFor(objectKey)
          : media.blockType === "video" && looksLikeVideoObjectKey(objectKey)
            ? optimizedVideoObjectKeyFor(objectKey)
            : "";
        if (!optimizedObjectKey) {
          stats.skippedUnsupported += 1;
          continue;
        }
        if (await objectExists(ossClient, optimizedObjectKey)) {
          const nextUrl = publicUrlForObject(optimizedObjectKey);
          console.log(`[notion] ${options.dryRun ? "would update" : "update"} ${title} ${block.id} -> ${optimizedObjectKey}`);
          if (!options.dryRun) {
            await retryAsync(() => notion.blocks.update({
              block_id: block.id,
              [media.blockType]: {
                external: { url: nextUrl },
                caption: media.caption
              }
            }), "notion block update");
          }
          stats.updated += 1;
        } else {
          stats.missingOptimized += 1;
          console.log(`[notion] missing optimized ${title} ${objectKey}`);
        }
      }
    }

    if (block.has_children) {
      stack.push(...await listChildren(notion, block.id));
    }
  }

  return stats;
}

async function main() {
  loadEnv(ENV_PATH);
  configureProxyFromEnv();
  const missing = requiredEnv().filter(([, ok]) => !ok).map(([name]) => name);
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`);

  const options = { dryRun: hasArg("dry-run"), slug: argValue("slug") };
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const ossClient = createOssClient();
  const allPages = await listAllPages(notion, process.env.NOTION_WORKS_DATABASE_ID);
  const pages = allPages.filter((page) => !options.slug || slugFromPage(page) === options.slug);
  const totals = {
    pages: pages.length,
    seenMedia: 0,
    updated: 0,
    alreadyOptimized: 0,
    missingOptimized: 0,
    nonOss: 0,
    skippedUnsupported: 0
  };

  console.log(`[notion] pages=${pages.length} dryRun=${options.dryRun}${options.slug ? ` slug=${options.slug}` : ""}`);
  for (const page of pages) {
    const stats = await updatePageBody(notion, ossClient, page, options);
    for (const key of Object.keys(totals)) {
      if (key !== "pages") totals[key] += stats[key] || 0;
    }
    console.log(`[notion] ${stats.title} media=${stats.seenMedia} updated=${stats.updated} alreadyOptimized=${stats.alreadyOptimized} nonOss=${stats.nonOss} missingOptimized=${stats.missingOptimized}`);
  }

  console.log(`[notion] summary ${JSON.stringify(totals)}`);
  if (!options.dryRun && totals.updated > 0) {
    console.log(`[notion] done. ${SYNC_STATUS_NAME} values were not changed.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
