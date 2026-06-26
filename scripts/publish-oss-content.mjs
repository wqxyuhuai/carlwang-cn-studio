import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import OSS from "ali-oss";
import { Client } from "@notionhq/client";

const ENV_PATH = path.resolve(".env.local");
const DEFAULT_CONTENT_KEY = "uploads/admin/site-content.json";
const LEGACY_CONTENT_URL = "https://carlwang-cn.oss-cn-shanghai.aliyuncs.com/uploads/site-content.json";
const SYNC_STATUS_NAME = String.fromCharCode(0x540c, 0x6b65, 0x72b6, 0x6001);
const DISPLAY_STATUS_NAME = String.fromCharCode(0x5c55, 0x793a, 0x72b6, 0x6001);
const CLICK_BEHAVIOR_NAME = String.fromCharCode(0x70b9, 0x51fb, 0x5904, 0x7406, 0x65b9, 0x5f0f);
const CARD_BG_NAME = String.fromCharCode(0x5361, 0x7247, 0x80cc, 0x666f, 0x8272, 0x53f7);
const CARD_LOGO_NAME = String.fromCharCode(0x5361, 0x7247, 0x6c, 0x6f, 0x67, 0x6f, 0x8272, 0x53f7);
const EDITING_STATUS = String.fromCharCode(0x7f16, 0x8f91, 0x4e2d);
const SHOW_STATUS = String.fromCharCode(0x5c55, 0x793a);

const tableConfigs = {
  categories: {
    env: "NOTION_WORK_TYPES_DATABASE_ID",
    label: "Studio Project Categories"
  },
  projects: {
    env: "NOTION_WORKS_DATABASE_ID",
    label: "Studio Projects"
  },
  tools: {
    env: "NOTION_TOOLS_DATABASE_ID",
    label: "Studio Tools"
  },
  social: {
    env: "NOTION_SOCIAL_LINKS_DATABASE_ID",
    label: "Studio Social Links"
  },
  experience: {
    env: "NOTION_ABOUT_EXPERIENCE_DATABASE_ID",
    label: "Studio Experience"
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
    contentKey: envValue("ALIYUN_OSS_CONTENT_KEY") || DEFAULT_CONTENT_KEY
  };
}

function selectedTables() {
  const arg = process.argv.find((item) => item.startsWith("--table="))?.split("=")[1] || "all";
  if (arg === "all") return Object.keys(tableConfigs);
  return arg.split(",").map((item) => item.trim()).filter(Boolean);
}

function requiredEnv(tableKeys) {
  const oss = getOssConfig();
  const checks = [
    ["NOTION_TOKEN", Boolean(process.env.NOTION_TOKEN)],
    ["ALIYUN_ACCESS_KEY_ID or ALIYUN_OSS_ACCESS_KEY_ID", Boolean(oss.accessKeyId)],
    ["ALIYUN_ACCESS_KEY_SECRET or ALIYUN_OSS_ACCESS_KEY_SECRET", Boolean(oss.accessKeySecret)],
    ["ALIYUN_OSS_BUCKET", Boolean(oss.bucket)],
    ["ALIYUN_OSS_REGION or ALIYUN_OSS_ENDPOINT", Boolean(oss.region || oss.endpoint)],
    ["ALIYUN_OSS_PUBLIC_BASE_URL", Boolean(oss.publicBaseUrl)]
  ];
  for (const tableKey of tableKeys) {
    checks.push([tableConfigs[tableKey].env, Boolean(process.env[tableConfigs[tableKey].env])]);
  }
  return checks;
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

function contentUrlForKey(key = getOssConfig().contentKey) {
  return `${getOssConfig().publicBaseUrl.replace(/\/+$/g, "")}/${key.replace(/^\/+/g, "")}`;
}

function slugify(value, fallback = "item") {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || fallback;
}

function richTextItems(property) {
  if (!property || typeof property !== "object") return [];
  if (Array.isArray(property.title)) return property.title;
  if (Array.isArray(property.rich_text)) return property.rich_text;
  return [];
}

function textFromRichText(value) {
  if (!Array.isArray(value)) return "";
  return value.map((part) => part?.plain_text || "").join("");
}

function spansFromRichText(value) {
  if (!Array.isArray(value)) return [];
  return value.map((part) => ({
    text: part?.plain_text || "",
    href: part?.href || undefined,
    bold: Boolean(part?.annotations?.bold),
    italic: Boolean(part?.annotations?.italic),
    code: Boolean(part?.annotations?.code),
    underline: Boolean(part?.annotations?.underline),
    strike: Boolean(part?.annotations?.strikethrough)
  })).filter((span) => span.text || span.href);
}

function titleFromProperty(property) {
  return textFromRichText(property?.title);
}

function richTextFromProperty(property) {
  return textFromRichText(property?.rich_text);
}

function numberFromProperty(property, fallback = 999) {
  if (!property) return fallback;
  if (property.type === "number" && typeof property.number === "number") return property.number;
  return fallback;
}

function checkboxFromProperty(property) {
  return Boolean(property?.checkbox);
}

function dateFromProperty(property) {
  return property?.date?.start || "";
}

function selectName(property) {
  if (!property) return "";
  if (property.type === "select") return property.select?.name || "";
  if (property.type === "status") return property.status?.name || "";
  return "";
}

function multiSelectNames(property) {
  return Array.isArray(property?.multi_select) ? property.multi_select.map((item) => item.name).filter(Boolean) : [];
}

function relationIds(property) {
  return Array.isArray(property?.relation) ? property.relation.map((item) => item.id).filter(Boolean) : [];
}

function fileUrls(property) {
  if (!property || property.type !== "files" || !Array.isArray(property.files)) return [];
  return property.files.map((file) => file?.[file.type]?.url || "").filter(Boolean);
}

function firstFileUrl(property) {
  return fileUrls(property)[0] || "";
}

function mediaFromUrl(url, alt, caption = "") {
  return {
    type: /\.(mp4|webm)(\?|$)/i.test(url) ? "video" : "image",
    src: url,
    alt,
    ...(caption ? { caption } : {})
  };
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

async function retryAsync(fn, label, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }
  }
  throw new Error(`${label} failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function isCurrentOssUrl(url) {
  const base = getOssConfig().publicBaseUrl.replace(/\/+$/g, "");
  return typeof url === "string" && url.startsWith(`${base}/`);
}

function assertOssUrls(urls, label, missingOss) {
  for (const url of urls.filter(Boolean)) {
    if (!isCurrentOssUrl(url)) missingOss.push(label);
  }
}

function blockMediaPayload(block) {
  if (!block?.type || !block[block.type]) return null;
  const payload = block[block.type];
  const mediaType = payload.type;
  const media = mediaType && payload[mediaType] ? payload[mediaType] : null;
  const url = media?.url || "";
  return url ? { url, caption: textFromRichText(payload.caption || []) } : null;
}

async function blockToContent(notion, block, missingOss, projectTitle) {
  const payload = block[block.type] || {};
  switch (block.type) {
    case "paragraph":
      return { type: "paragraph", text: spansFromRichText(payload.rich_text) };
    case "heading_1":
    case "heading_2":
    case "heading_3":
      return { type: block.type, text: spansFromRichText(payload.rich_text) };
    case "bulleted_list_item":
      return { type: "bulleted_list", items: [spansFromRichText(payload.rich_text)] };
    case "numbered_list_item":
      return { type: "numbered_list", items: [spansFromRichText(payload.rich_text)] };
    case "quote":
    case "callout":
      return { type: block.type, text: spansFromRichText(payload.rich_text) };
    case "divider":
      return { type: "divider" };
    case "image":
    case "video": {
      const media = blockMediaPayload(block);
      if (!media) return null;
      assertOssUrls([media.url], `${projectTitle} page body ${block.type}`, missingOss);
      return {
        type: block.type === "video" ? "video" : "image",
        media: mediaFromUrl(media.url, `${projectTitle} ${block.type}`, media.caption)
      };
    }
    case "file":
    case "pdf": {
      const media = blockMediaPayload(block);
      if (!media) return null;
      assertOssUrls([media.url], `${projectTitle} page body ${block.type}`, missingOss);
      return {
        type: "bookmark",
        title: media.caption || `${projectTitle} ${block.type}`,
        url: media.url,
        description: ""
      };
    }
    case "bookmark":
      return {
        type: "bookmark",
        title: payload.caption?.length ? textFromRichText(payload.caption) : payload.url,
        url: payload.url || "",
        description: ""
      };
    case "embed":
    case "link_preview":
      return {
        type: "bookmark",
        title: payload.caption?.length ? textFromRichText(payload.caption) : payload.url,
        url: payload.url || "",
        description: ""
      };
    case "column_list": {
      const columns = [];
      for (const child of await listChildren(notion, block.id)) {
        if (child.type !== "column") continue;
        const columnBlocks = await listChildren(notion, child.id);
        columns.push((await blocksToContent(notion, columnBlocks, missingOss, projectTitle)).filter(Boolean));
      }
      return { type: "column_list", columns };
    }
    case "toggle": {
      const children = block.has_children ? await blocksToContent(notion, await listChildren(notion, block.id), missingOss, projectTitle) : [];
      return { type: "toggle", title: spansFromRichText(payload.rich_text), children };
    }
    default:
      return null;
  }
}

async function blocksToContent(notion, blocks, missingOss, projectTitle) {
  const content = [];
  for (const block of blocks) {
    const converted = await blockToContent(notion, block, missingOss, projectTitle);
    if (!converted) continue;

    const previous = content[content.length - 1];
    if (
      previous &&
      converted.type === previous.type &&
      (converted.type === "bulleted_list" || converted.type === "numbered_list")
    ) {
      previous.items.push(...converted.items);
    } else if (converted.type !== "paragraph" || converted.text.length > 0) {
      content.push(converted);
    }
  }
  return content;
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    return await response.json();
  } catch {
    return null;
  }
}

async function readExistingContent() {
  const target = await fetchJson(contentUrlForKey());
  if (target && typeof target === "object") return target;
  const legacy = await fetchJson(LEGACY_CONTENT_URL);
  if (legacy && typeof legacy === "object") return legacy;
  return { settings: {}, works: [], workTypes: [], tools: [], socials: [] };
}

async function readCategories(notion, missingOss) {
  const pages = await listAllPages(notion, process.env.NOTION_WORK_TYPES_DATABASE_ID);
  const categories = [];
  const byId = new Map();

  for (const page of pages) {
    const properties = page.properties || {};
    if (selectName(properties[SYNC_STATUS_NAME]) === EDITING_STATUS) continue;
    const name = titleFromProperty(properties.Category);
    if (!name) continue;
    const iconUrl = firstFileUrl(properties.Cover);
    assertOssUrls([iconUrl], `category ${name} Cover`, missingOss);
    const item = {
      id: page.id,
      nameEn: name,
      nameCn: "",
      slug: slugify(name),
      shortLabel: name,
      descriptionEn: "",
      descriptionCn: "",
      iconUrl,
      homeVisible: true,
      filterVisible: true,
      order: numberFromProperty(properties.Order, 999),
      status: "Published",
      workCount: 0
    };
    categories.push(item);
    byId.set(page.id, item);
  }

  return { categories: categories.sort((left, right) => left.order - right.order), byId };
}

async function readProjects(notion, categoryById, missingOss, options = {}) {
  const pages = await listAllPages(notion, process.env.NOTION_WORKS_DATABASE_ID);
  const projects = [];

  for (const page of pages) {
    const properties = page.properties || {};
    if (selectName(properties[SYNC_STATUS_NAME]) === EDITING_STATUS) continue;
    const title = titleFromProperty(properties.Title);
    const slug = richTextFromProperty(properties.Slug) || slugify(title, page.id);
    if (!title || !slug) continue;

    const displayStatus = selectName(properties[DISPLAY_STATUS_NAME]);
    const status = displayStatus === SHOW_STATUS || displayStatus === "Published" || displayStatus === "Show" ? "Published" : "Draft";
    const date = dateFromProperty(properties.Date);
    const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
    const categoryId = relationIds(properties.Category)[0] || "";
    const category = categoryById.get(categoryId);
    const categoryName = category?.nameEn || "";
    const coverUrl = firstFileUrl(properties.Cover);
    if (!coverUrl || !isCurrentOssUrl(coverUrl)) {
      console.log(`[publish] skip project without synced OSS cover: ${title}`);
      continue;
    }
    const content = options.skipBody
      ? []
      : await blocksToContent(notion, await listChildren(notion, page.id), missingOss, title);

    projects.push({
      id: page.id,
      title,
      slug,
      status,
      year,
      publishedAt: date,
      viewCount: 0,
      likeCount: 0,
      category: categoryName || "Selected Work",
      primaryType: categoryName || "Selected Work",
      primaryTypeSlug: category?.slug || slugify(categoryName || "selected-work"),
      tags: [],
      featured: checkboxFromProperty(properties.Featured),
      featuredOrder: date ? -new Date(date).getTime() : 999,
      order: date ? -new Date(date).getTime() : 999,
      cover: mediaFromUrl(coverUrl, `${title} cover`),
      intro: categoryName || title,
      role: "",
      tools: multiSelectNames(properties.Tools),
      gallery: coverUrl ? [mediaFromUrl(coverUrl, `${title} gallery image 1`)] : [],
      content,
      notionPageId: page.id,
      notionUrl: page.url
    });
  }

  return projects.sort((left, right) => left.order - right.order);
}

async function readTools(notion, missingOss) {
  const pages = await listAllPages(notion, process.env.NOTION_TOOLS_DATABASE_ID);
  const tools = [];
  for (const page of pages) {
    const properties = page.properties || {};
    if (selectName(properties[SYNC_STATUS_NAME]) === EDITING_STATUS) continue;
    const name = titleFromProperty(properties.Name);
    if (!name) continue;
    const iconUrl = firstFileUrl(properties["Logo SVG"]);
    assertOssUrls([iconUrl], `tool ${name} Logo SVG`, missingOss);
    const active = checkboxFromProperty(properties.Active);
    tools.push({
      id: page.id,
      name,
      category: selectName(properties.Category) || "Design",
      iconUrl,
      description: "",
      descriptionCn: "",
      homeVisible: active,
      status: active ? "Published" : "Archived",
      active,
      order: numberFromProperty(properties.Order, 999)
    });
  }
  return tools.sort((left, right) => left.order - right.order);
}

async function readSocials(notion, missingOss) {
  const pages = await listAllPages(notion, process.env.NOTION_SOCIAL_LINKS_DATABASE_ID);
  const socials = [];
  for (const page of pages) {
    const properties = page.properties || {};
    if (selectName(properties[SYNC_STATUS_NAME]) === EDITING_STATUS) continue;
    const platform = titleFromProperty(properties.Platform);
    if (!platform) continue;
    const iconUrl = firstFileUrl(properties["Black Logo"]);
    const colorIconUrl = firstFileUrl(properties["Color Logo"]);
    assertOssUrls([iconUrl, colorIconUrl], `social ${platform} logo`, missingOss);
    const active = checkboxFromProperty(properties.Active);
    const group = selectName(properties.Group) || "Social";
    socials.push({
      id: page.id,
      platform,
      label: richTextFromProperty(properties["Display Label"]) || platform,
      labelCn: "",
      url: properties.URL?.url || "",
      group,
      type: group,
      iconUrl,
      colorIconUrl,
      cardBackgroundColor: richTextFromProperty(properties[CARD_BG_NAME]),
      cardLogoColor: richTextFromProperty(properties[CARD_LOGO_NAME]),
      footerVisible: group === "Footer" || group === "Portfolio" || group === "Social",
      contactVisible: group === "Contact" || group === "Portfolio" || group === "Social" || group === "Form",
      status: active ? "Published" : "Archived",
      active,
      order: numberFromProperty(properties.Order, 999),
      clickBehavior: selectName(properties[CLICK_BEHAVIOR_NAME])
    });
  }
  return socials.sort((left, right) => left.order - right.order);
}

async function readExperiences(notion, missingOss) {
  const pages = await listAllPages(notion, process.env.NOTION_ABOUT_EXPERIENCE_DATABASE_ID);
  const experiences = [];
  for (const page of pages) {
    const properties = page.properties || {};
    if (selectName(properties[SYNC_STATUS_NAME]) === EDITING_STATUS) continue;
    const title = titleFromProperty(properties.Title);
    if (!title) continue;
    const imageUrl = firstFileUrl(properties["Company Logo"]);
    assertOssUrls([imageUrl], `experience ${title} Company Logo`, missingOss);
    experiences.push({
      id: page.id,
      title,
      organization: richTextFromProperty(properties.Company),
      location: "",
      startDate: dateFromProperty(properties["Start Date"]),
      endDate: dateFromProperty(properties["End Date"]),
      dateLabel: richTextFromProperty(properties["Date Label"]),
      isCurrent: false,
      descriptionEn: richTextFromProperty(properties.Description),
      descriptionCn: "",
      tags: [selectName(properties.Type)].filter(Boolean),
      imageUrl,
      order: numberFromProperty(properties.Order, 999),
      visible: checkboxFromProperty(properties.Active)
    });
  }
  return experiences.sort((left, right) => left.order - right.order);
}

async function uploadContentJson(data) {
  const client = createOssClient();
  const key = getOssConfig().contentKey;
  const body = Buffer.from(`${JSON.stringify(data, null, 2)}\n`, "utf8");
  await client.put(key, body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  });
  return contentUrlForKey(key);
}

async function main() {
  loadEnv(ENV_PATH);
  const tableKeys = selectedTables();
  const skipBody = process.argv.includes("--skip-body");
  for (const tableKey of tableKeys) {
    if (!tableConfigs[tableKey]) throw new Error(`Unknown table: ${tableKey}`);
  }
  const missing = requiredEnv(tableKeys).filter(([, ok]) => !ok).map(([key]) => key);
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`);

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const missingOss = [];
  const existing = await readExistingContent();
  const nextContent = {
    ...existing,
    settings: existing.settings || {},
    works: Array.isArray(existing.works) ? existing.works : [],
    workTypes: Array.isArray(existing.workTypes) ? existing.workTypes : [],
    tools: Array.isArray(existing.tools) ? existing.tools : [],
    socials: Array.isArray(existing.socials) ? existing.socials : [],
    experiences: Array.isArray(existing.experiences) ? existing.experiences : []
  };

  let categoryById = new Map((nextContent.workTypes || []).map((item) => [item.id, item]));
  if (tableKeys.includes("categories") || tableKeys.includes("projects")) {
    const categoryResult = await readCategories(notion, missingOss);
    categoryById = categoryResult.byId;
    if (tableKeys.includes("categories")) nextContent.workTypes = categoryResult.categories;
  }
  if (tableKeys.includes("projects")) nextContent.works = await readProjects(notion, categoryById, missingOss, { skipBody });
  if (tableKeys.includes("tools")) nextContent.tools = await readTools(notion, missingOss);
  if (tableKeys.includes("social")) nextContent.socials = await readSocials(notion, missingOss);
  if (tableKeys.includes("experience")) nextContent.experiences = await readExperiences(notion, missingOss);

  if (missingOss.length) {
    const unique = Array.from(new Set(missingOss));
    throw new Error(`Some files are not current OSS URLs yet: ${unique.join("; ")}. Run: npm run content:sync-assets -- --table=${tableKeys.join(",")} --only-pending`);
  }

  nextContent.sync = {
    source: "oss",
    publishedAt: new Date().toISOString(),
    tables: tableKeys
  };

  const publicUrl = await uploadContentJson(nextContent);
  console.log(`[publish] uploaded ${publicUrl}`);
  console.log(`[publish] works=${nextContent.works.length} workTypes=${nextContent.workTypes.length} tools=${nextContent.tools.length} socials=${nextContent.socials.length} experiences=${nextContent.experiences.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
