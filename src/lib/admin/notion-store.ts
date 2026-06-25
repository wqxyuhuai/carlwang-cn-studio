import { Client } from "@notionhq/client";
import type { MediaItem, NotionBlock, RichTextSpan } from "@/lib/types";
import type { AdminCollectionConfig, AdminField, AdminRecord, AdminValue, NotionFieldType, NotionPropertyMapping } from "./schema";

type CreatePageArgs = Parameters<Client["pages"]["create"]>[0];
type UpdatePageArgs = Parameters<Client["pages"]["update"]>[0];
type QueryDataSourceArgs = Parameters<Client["dataSources"]["query"]>[0];
type RetrieveDataSourceArgs = Parameters<Client["dataSources"]["retrieve"]>[0];
type ListBlockChildrenArgs = Parameters<Client["blocks"]["children"]["list"]>[0];

type NotionProperties = Record<string, Record<string, unknown> & { type?: string }>;
type ResolvedMapping = NotionPropertyMapping & {
  property?: NotionProperties[string];
};

export type NotionDatabaseSchemaSummary = {
  expectedFields: number;
  writableFields: number;
  missingFields: string[];
  typeMismatches: string[];
};

function notionToken() {
  return process.env.NOTION_TOKEN || "";
}

export function hasNotionToken() {
  return Boolean(notionToken());
}

export function getNotionClient() {
  const token = notionToken();

  if (!token) {
    throw new Error("NOTION_TOKEN is not configured.");
  }

  return new Client({ auth: token });
}

export function getDatabaseId(config: AdminCollectionConfig) {
  for (const envKey of config.databaseEnv) {
    const value = process.env[envKey];
    if (value) return value;
  }

  return "";
}

function textFromRichArray(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (part && typeof part === "object" && "plain_text" in part && typeof part.plain_text === "string") {
        return part.plain_text;
      }
      return "";
    })
    .join("");
}

function fileUrlFromArray(value: unknown) {
  if (!Array.isArray(value)) return "";

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const file = item as Record<string, unknown>;
    const type = typeof file.type === "string" ? file.type : "";
    const payload = type && file[type] && typeof file[type] === "object" ? file[type] as Record<string, unknown> : {};
    if (typeof payload.url === "string" && payload.url) return payload.url;
  }

  return "";
}

function propertyValue(property: unknown): AdminValue {
  if (!property || typeof property !== "object" || !("type" in property)) {
    return "";
  }

  const prop = property as Record<string, unknown>;
  switch (prop.type) {
    case "title":
      return textFromRichArray(prop.title);
    case "text":
      return typeof prop.text === "string" ? prop.text : textFromRichArray(prop.rich_text);
    case "rich_text":
      return textFromRichArray(prop.rich_text);
    case "file":
    case "files":
      return fileUrlFromArray(prop.files);
    case "number":
      return typeof prop.number === "number" ? prop.number : 0;
    case "checkbox":
      return Boolean(prop.checkbox);
    case "select":
    case "status": {
      const select = prop[prop.type];
      if (select && typeof select === "object" && "name" in select && typeof select.name === "string") {
        return select.name;
      }
      return "";
    }
    case "multi_select":
      return Array.isArray(prop.multi_select)
        ? prop.multi_select
          .map((item) => (item && typeof item === "object" && "name" in item && typeof item.name === "string" ? item.name : ""))
          .filter(Boolean)
          .join(", ")
        : "";
    case "relation":
      return Array.isArray(prop.relation)
        ? prop.relation
          .map((item) => (item && typeof item === "object" && "id" in item && typeof item.id === "string" ? item.id : ""))
          .filter(Boolean)
          .join("\n")
        : "";
    case "url":
      return typeof prop.url === "string" ? prop.url : "";
    case "email":
      return typeof prop.email === "string" ? prop.email : "";
    case "date": {
      const date = prop.date;
      if (date && typeof date === "object" && "start" in date && typeof date.start === "string") {
        return date.start;
      }
      return "";
    }
    case "created_time":
      return typeof prop.created_time === "string" ? prop.created_time : "";
    case "last_edited_time":
      return typeof prop.last_edited_time === "string" ? prop.last_edited_time : "";
    default:
      return "";
  }
}

function propertyMappings(field: AdminField) {
  if (!field.notion) return [];
  const { aliases, ...primary } = field.notion;
  return [primary, ...(aliases || [])];
}

function compatibleTypes(expected: NotionFieldType, actual?: string) {
  if (!actual) return false;
  if (expected === actual) return true;
  if ((expected === "file" || expected === "files") && (actual === "file" || actual === "files")) return true;
  if ((expected === "text" || expected === "rich_text") && (actual === "text" || actual === "rich_text")) return true;
  return false;
}

function resolveFieldMapping(field: AdminField, properties?: NotionProperties): ResolvedMapping | null {
  const mappings = propertyMappings(field);
  if (mappings.length === 0) return null;
  if (!properties) return mappings[0];

  for (const mapping of mappings) {
    const property = properties[mapping.name];
    if (compatibleTypes(mapping.type, property?.type)) return { ...mapping, property };
  }

  for (const mapping of mappings) {
    const property = properties[mapping.name];
    if (property) return { ...mapping, property };
  }

  return mappings[0];
}

function nativeReadOnlyType(type: NotionFieldType) {
  return type === "created_time" || type === "last_edited_time";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeMappedValue(field: AdminField, mapping: ResolvedMapping, value: AdminValue): AdminValue {
  const stringValue = adminValueToString(value).trim();

  if (field.key === "status") {
    if (mapping.name === "展示状态") {
      if (stringValue === "展示") return "Published";
      if (stringValue === "不展示") return "Draft";
    }
  }

  if (field.key === "slug" && mapping.name === "Category" && stringValue) {
    return slugify(stringValue) || stringValue;
  }

  return value;
}

function schemaSummary(config: AdminCollectionConfig, properties?: NotionProperties, options: { includeReadOnly?: boolean } = {}): NotionDatabaseSchemaSummary {
  const missingFields: string[] = [];
  const typeMismatches: string[] = [];
  let expectedFields = 0;
  let writableFields = 0;

  for (const field of config.fields) {
    const mappings = propertyMappings(field);
    if (mappings.length === 0) continue;

    const primaryType = mappings[0].type;
    expectedFields += 1;
    if (!field.readOnly && !nativeReadOnlyType(primaryType)) writableFields += 1;
    if (!options.includeReadOnly && field.readOnly) continue;

    if (!properties) continue;

    const exact = mappings.find((mapping) => compatibleTypes(mapping.type, properties[mapping.name]?.type));
    if (exact) continue;

    const existing = mappings.find((mapping) => properties[mapping.name]);
    if (!existing) {
      missingFields.push(`${field.label} (${mappings.map((mapping) => mapping.name).join(" or ")})`);
      continue;
    }

    const actualType = properties[existing.name]?.type || "unknown";
    typeMismatches.push(`${field.label}: ${existing.name} is ${actualType}, expected ${existing.type}`);
  }

  return { expectedFields, writableFields, missingFields, typeMismatches };
}

export function getExpectedNotionSchema(config: AdminCollectionConfig): NotionDatabaseSchemaSummary {
  return schemaSummary(config);
}

async function retrieveDataSourceProperties(client: Client, dataSourceId: string): Promise<NotionProperties> {
  const response = await client.dataSources.retrieve({ data_source_id: dataSourceId } as RetrieveDataSourceArgs);
  const properties = response && typeof response === "object" && "properties" in response && response.properties && typeof response.properties === "object"
    ? response.properties
    : {};
  return properties as NotionProperties;
}

function assertWritableSchema(config: AdminCollectionConfig, properties: NotionProperties, includeReadOnly: boolean) {
  const summary = schemaSummary(config, properties, { includeReadOnly });
  const blockingMissing = summary.missingFields.filter((field) => !field.includes("Created At") && !field.includes("Updated At"));
  const blockingMismatches = summary.typeMismatches.filter((field) => !field.includes("Created At") && !field.includes("Updated At"));

  if (blockingMissing.length === 0 && blockingMismatches.length === 0) return;

  const parts = [`Notion schema mismatch for ${config.notionTableName}.`];
  if (config.legacyTableNames?.length) {
    parts.push(`Compatible legacy table names: ${config.legacyTableNames.join(", ")}.`);
  }
  if (blockingMissing.length > 0) parts.push(`Missing properties: ${blockingMissing.join("; ")}.`);
  if (blockingMismatches.length > 0) parts.push(`Type mismatches: ${blockingMismatches.join("; ")}.`);
  parts.push("Update the Notion database properties or add a schema alias before writing.");
  throw new Error(parts.join(" "));
}

function pageToRecord(page: unknown, config: AdminCollectionConfig): AdminRecord | null {
  if (!page || typeof page !== "object") return null;
  const pageObject = page as Record<string, unknown>;
  if (pageObject.object !== "page" || typeof pageObject.id !== "string") return null;

  const properties = pageObject.properties && typeof pageObject.properties === "object"
    ? (pageObject.properties as NotionProperties)
    : {};

  const record: AdminRecord = {
    id: pageObject.id,
    createdAt: typeof pageObject.created_time === "string" ? pageObject.created_time : undefined,
    updatedAt: typeof pageObject.last_edited_time === "string" ? pageObject.last_edited_time : undefined,
    notionUrl: typeof pageObject.url === "string" ? pageObject.url : undefined
  };

  for (const field of config.fields) {
    const mapping = resolveFieldMapping(field, properties);
    if (!mapping) continue;
    record[field.key] = normalizeMappedValue(field, mapping, propertyValue(properties[mapping.name]));
  }

  return record;
}

function adminValueToString(value: AdminValue | undefined) {
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

function splitListValue(value: string) {
  return value
    .split(/[\n,]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function propertyForField(field: AdminField, value: AdminValue | undefined, includeReadOnly: boolean, mapping: ResolvedMapping | null) {
  if (!mapping || (field.readOnly && !includeReadOnly) || nativeReadOnlyType(mapping.type)) return null;

  const rawStringValue = adminValueToString(value).trim();
  const stringValue = (() => {
    if (field.key === "status" && mapping.name === "展示状态") {
      return rawStringValue === "Published" ? "展示" : "不展示";
    }
    return rawStringValue;
  })();

  switch (mapping.type) {
    case "title":
      return {
        name: mapping.name,
        value: {
          title: [{ text: { content: stringValue || "Untitled" } }]
        }
      };
    case "rich_text":
      return {
        name: mapping.name,
        value: {
          rich_text: stringValue ? [{ text: { content: stringValue.slice(0, 2000) } }] : []
        }
      };
    case "text":
      return {
        name: mapping.name,
        value: {
          rich_text: stringValue ? [{ text: { content: stringValue.slice(0, 2000) } }] : []
        }
      };
    case "number":
      return {
        name: mapping.name,
        value: {
          number: typeof value === "number" ? value : stringValue ? Number(stringValue) : null
        }
      };
    case "checkbox":
      return {
        name: mapping.name,
        value: {
          checkbox: Boolean(value)
        }
      };
    case "select":
      return {
        name: mapping.name,
        value: {
          select: stringValue ? { name: stringValue } : null
        }
      };
    case "status":
      return {
        name: mapping.name,
        value: {
          status: stringValue ? { name: stringValue } : null
        }
      };
    case "multi_select":
      return {
        name: mapping.name,
        value: {
          multi_select: splitListValue(stringValue).map((name) => ({ name }))
        }
      };
    case "relation":
      return {
        name: mapping.name,
        value: {
          relation: splitListValue(stringValue).map((id) => ({ id }))
        }
      };
    case "url":
      return {
        name: mapping.name,
        value: {
          url: stringValue || null
        }
      };
    case "file":
    case "files":
      return {
        name: mapping.name,
        value: {
          files: stringValue
            ? [
              {
                name: stringValue.split("/").pop() || "External file",
                type: "external",
                external: { url: stringValue }
              }
            ]
            : []
        }
      };
    case "email":
      return {
        name: mapping.name,
        value: {
          email: stringValue || null
        }
      };
    case "date":
      return {
        name: mapping.name,
        value: {
          date: stringValue ? { start: stringValue } : null
        }
      };
    default:
      return null;
  }
}

function propertiesFromRecord(config: AdminCollectionConfig, record: Partial<AdminRecord>, includeReadOnly = false, properties?: NotionProperties) {
  const notionProperties: Record<string, unknown> = {};

  for (const field of config.fields) {
    const property = propertyForField(field, record[field.key], includeReadOnly, resolveFieldMapping(field, properties));
    if (property) {
      notionProperties[property.name] = property.value;
    }
  }

  return notionProperties;
}

export async function listNotionRecords(config: AdminCollectionConfig) {
  const dataSourceId = getDatabaseId(config);
  if (!dataSourceId) {
    throw new Error(`No data source ID configured for ${config.label}. Set ${config.databaseEnv.join(" or ")}.`);
  }

  const client = getNotionClient();
  const records: AdminRecord[] = [];
  let startCursor: string | undefined;

  do {
    const args: QueryDataSourceArgs = {
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: startCursor,
      result_type: "page"
    };
    const response = await client.dataSources.query(args);
    records.push(...response.results.map((page) => pageToRecord(page, config)).filter((record): record is AdminRecord => Boolean(record)));
    startCursor = response.has_more ? response.next_cursor || undefined : undefined;
  } while (startCursor);

  return records.sort((left, right) => Number(left.order || 999) - Number(right.order || 999));
}

export async function createNotionRecord(config: AdminCollectionConfig, input: Partial<AdminRecord>, includeReadOnly = false) {
  const dataSourceId = getDatabaseId(config);
  if (!dataSourceId) {
    throw new Error(`No data source ID configured for ${config.label}. Set ${config.databaseEnv.join(" or ")}.`);
  }

  const client = getNotionClient();
  const properties = await retrieveDataSourceProperties(client, dataSourceId);
  assertWritableSchema(config, properties, includeReadOnly);
  const response = await client.pages.create({
    parent: { data_source_id: dataSourceId },
    properties: propertiesFromRecord(config, input, includeReadOnly, properties) as CreatePageArgs["properties"]
  });

  return pageToRecord(response, config);
}

export async function updateNotionRecord(config: AdminCollectionConfig, id: string, input: Partial<AdminRecord>, includeReadOnly = false) {
  const dataSourceId = getDatabaseId(config);
  if (!dataSourceId) {
    throw new Error(`No data source ID configured for ${config.label}. Set ${config.databaseEnv.join(" or ")}.`);
  }

  const client = getNotionClient();
  const properties = await retrieveDataSourceProperties(client, dataSourceId);
  assertWritableSchema(config, properties, includeReadOnly);
  const response = await client.pages.update({
    page_id: id,
    properties: propertiesFromRecord(config, input, includeReadOnly, properties) as UpdatePageArgs["properties"]
  });

  return pageToRecord(response, config);
}

export async function archiveNotionRecord(id: string) {
  const client = getNotionClient();
  await client.pages.update({
    page_id: id,
    archived: true
  });
}

export async function testNotionDatabase(config: AdminCollectionConfig) {
  const dataSourceId = getDatabaseId(config);
  const expected = getExpectedNotionSchema(config);

  if (config.databaseEnv.length === 0) {
    return {
      key: config.key,
      label: config.label,
      tableName: config.notionTableName,
      status: "local",
      databaseId: "",
      ...expected
    };
  }

  if (!dataSourceId) {
    return {
      key: config.key,
      label: config.label,
      tableName: config.notionTableName,
      status: "missing",
      databaseId: "",
      ...expected
    };
  }

  if (!hasNotionToken()) {
    return {
      key: config.key,
      label: config.label,
      tableName: config.notionTableName,
      status: "missing-token",
      databaseId: dataSourceId,
      ...expected
    };
  }

  try {
    const client = getNotionClient();
    const properties = await retrieveDataSourceProperties(client, dataSourceId);
    const summary = schemaSummary(config, properties, { includeReadOnly: true });
    await client.dataSources.query({ data_source_id: dataSourceId, page_size: 1, result_type: "page" });

    return {
      key: config.key,
      label: config.label,
      tableName: config.notionTableName,
      status: summary.missingFields.length > 0 || summary.typeMismatches.length > 0 ? "schema-warning" : "connected",
      databaseId: dataSourceId,
      ...summary
    };
  } catch (error) {
    return {
      key: config.key,
      label: config.label,
      tableName: config.notionTableName,
      status: "error",
      databaseId: dataSourceId,
      error: error instanceof Error ? error.message : "Unknown Notion error",
      ...expected
    };
  }
}

function richTextSpans(value: unknown): RichTextSpan[] {
  if (!Array.isArray(value)) return [];

  const spans: RichTextSpan[] = [];

  for (const part of value) {
    if (!part || typeof part !== "object") continue;
    const item = part as Record<string, unknown>;
    const text = typeof item.plain_text === "string" ? item.plain_text : "";
    if (!text) continue;
    const href = typeof item.href === "string" ? item.href : undefined;
    const annotations = item.annotations && typeof item.annotations === "object" ? item.annotations as Record<string, unknown> : {};

    const span: RichTextSpan = {
      text,
      bold: Boolean(annotations.bold),
      italic: Boolean(annotations.italic),
      code: Boolean(annotations.code),
      underline: Boolean(annotations.underline),
      strike: Boolean(annotations.strikethrough)
    };
    if (href) span.href = href;
    spans.push(span);
  }

  return spans;
}

function plainRichText(value: unknown) {
  return richTextSpans(value).map((span) => span.text).join("");
}

function blockPayload(block: Record<string, unknown>) {
  return typeof block.type === "string" && block[block.type] && typeof block[block.type] === "object"
    ? block[block.type] as Record<string, unknown>
    : {};
}

function mediaFromBlock(block: Record<string, unknown>, type: "image" | "video"): MediaItem | null {
  const payload = blockPayload(block);
  const mediaType = typeof payload.type === "string" ? payload.type : "";
  const media = mediaType && payload[mediaType] && typeof payload[mediaType] === "object"
    ? payload[mediaType] as Record<string, unknown>
    : {};
  const url = typeof media.url === "string" ? media.url : "";
  if (!url) return null;

  const caption = plainRichText(payload.caption);
  return {
    type,
    src: url,
    alt: caption || "Notion media",
    caption: caption || undefined
  };
}

function notionBlockToPublicBlock(block: unknown): NotionBlock | null {
  if (!block || typeof block !== "object") return null;
  const object = block as Record<string, unknown>;
  if (object.object !== "block" || typeof object.type !== "string") return null;
  const payload = blockPayload(object);

  switch (object.type) {
    case "paragraph":
      return { type: "paragraph", text: richTextSpans(payload.rich_text) };
    case "heading_1":
    case "heading_2":
    case "heading_3":
      return { type: object.type, text: richTextSpans(payload.rich_text) };
    case "bulleted_list_item":
      return { type: "bulleted_list", items: [richTextSpans(payload.rich_text)] };
    case "numbered_list_item":
      return { type: "numbered_list", items: [richTextSpans(payload.rich_text)] };
    case "quote":
      return { type: "quote", text: richTextSpans(payload.rich_text) };
    case "callout":
      return { type: "callout", text: richTextSpans(payload.rich_text) };
    case "divider":
      return { type: "divider" };
    case "image": {
      const media = mediaFromBlock(object, "image");
      return media ? { type: "image", media } : null;
    }
    case "video": {
      const media = mediaFromBlock(object, "video");
      return media ? { type: "video", media } : null;
    }
    default:
      return null;
  }
}

export async function getNotionPageBlocks(pageId: string): Promise<NotionBlock[]> {
  if (!hasNotionToken()) return [];

  const client = getNotionClient();
  const blocks: NotionBlock[] = [];
  let startCursor: string | undefined;

  do {
    const args: ListBlockChildrenArgs = {
      block_id: pageId,
      page_size: 100,
      start_cursor: startCursor
    };
    const response = await client.blocks.children.list(args);
    blocks.push(...response.results.map(notionBlockToPublicBlock).filter((block): block is NotionBlock => Boolean(block)));
    startCursor = response.has_more ? response.next_cursor || undefined : undefined;
  } while (startCursor);

  return blocks.filter((block) => block.type !== "paragraph" || block.text.length > 0);
}
