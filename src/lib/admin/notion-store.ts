import { Client } from "@notionhq/client";
import type { AdminCollectionConfig, AdminField, AdminRecord, AdminValue } from "./schema";

type CreatePageArgs = Parameters<Client["pages"]["create"]>[0];
type UpdatePageArgs = Parameters<Client["pages"]["update"]>[0];
type QueryDataSourceArgs = Parameters<Client["dataSources"]["query"]>[0];

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

function propertyValue(property: unknown): AdminValue {
  if (!property || typeof property !== "object" || !("type" in property)) {
    return "";
  }

  const prop = property as Record<string, unknown>;
  switch (prop.type) {
    case "title":
      return textFromRichArray(prop.title);
    case "rich_text":
      return textFromRichArray(prop.rich_text);
    case "number":
      return typeof prop.number === "number" ? prop.number : 0;
    case "checkbox":
      return Boolean(prop.checkbox);
    case "select": {
      const select = prop.select;
      if (select && typeof select === "object" && "name" in select && typeof select.name === "string") {
        return select.name;
      }
      return "";
    }
    case "url":
      return typeof prop.url === "string" ? prop.url : "";
    case "email":
      return typeof prop.email === "string" ? prop.email : "";
    case "created_time":
      return typeof prop.created_time === "string" ? prop.created_time : "";
    case "last_edited_time":
      return typeof prop.last_edited_time === "string" ? prop.last_edited_time : "";
    default:
      return "";
  }
}

function pageToRecord(page: unknown, config: AdminCollectionConfig): AdminRecord | null {
  if (!page || typeof page !== "object") return null;
  const pageObject = page as Record<string, unknown>;
  if (pageObject.object !== "page" || typeof pageObject.id !== "string") return null;

  const properties = pageObject.properties && typeof pageObject.properties === "object"
    ? (pageObject.properties as Record<string, unknown>)
    : {};

  const record: AdminRecord = {
    id: pageObject.id,
    createdAt: typeof pageObject.created_time === "string" ? pageObject.created_time : undefined,
    updatedAt: typeof pageObject.last_edited_time === "string" ? pageObject.last_edited_time : undefined,
    notionUrl: typeof pageObject.url === "string" ? pageObject.url : undefined
  };

  for (const field of config.fields) {
    if (!field.notion) continue;
    record[field.key] = propertyValue(properties[field.notion.name]);
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

function propertyForField(field: AdminField, value: AdminValue | undefined, includeReadOnly: boolean) {
  if (!field.notion || (field.readOnly && !includeReadOnly)) return null;

  const stringValue = adminValueToString(value).trim();
  switch (field.notion.type) {
    case "title":
      return {
        name: field.notion.name,
        value: {
          title: [{ text: { content: stringValue || "Untitled" } }]
        }
      };
    case "rich_text":
      return {
        name: field.notion.name,
        value: {
          rich_text: stringValue ? [{ text: { content: stringValue.slice(0, 2000) } }] : []
        }
      };
    case "number":
      return {
        name: field.notion.name,
        value: {
          number: typeof value === "number" ? value : Number(stringValue || 0)
        }
      };
    case "checkbox":
      return {
        name: field.notion.name,
        value: {
          checkbox: Boolean(value)
        }
      };
    case "select":
      return {
        name: field.notion.name,
        value: {
          select: stringValue ? { name: stringValue } : null
        }
      };
    case "url":
      return {
        name: field.notion.name,
        value: {
          url: stringValue || null
        }
      };
    case "email":
      return {
        name: field.notion.name,
        value: {
          email: stringValue || null
        }
      };
    default:
      return null;
  }
}

function propertiesFromRecord(config: AdminCollectionConfig, record: Partial<AdminRecord>, includeReadOnly = false) {
  const properties: Record<string, unknown> = {};

  for (const field of config.fields) {
    const property = propertyForField(field, record[field.key], includeReadOnly);
    if (property) {
      properties[property.name] = property.value;
    }
  }

  return properties;
}

export async function listNotionRecords(config: AdminCollectionConfig) {
  const dataSourceId = getDatabaseId(config);
  if (!dataSourceId) {
    throw new Error(`No data source ID configured for ${config.label}.`);
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
    throw new Error(`No data source ID configured for ${config.label}.`);
  }

  const client = getNotionClient();
  const response = await client.pages.create({
    parent: { data_source_id: dataSourceId },
    properties: propertiesFromRecord(config, input, includeReadOnly) as CreatePageArgs["properties"]
  });

  return pageToRecord(response, config);
}

export async function updateNotionRecord(config: AdminCollectionConfig, id: string, input: Partial<AdminRecord>, includeReadOnly = false) {
  const client = getNotionClient();
  const response = await client.pages.update({
    page_id: id,
    properties: propertiesFromRecord(config, input, includeReadOnly) as UpdatePageArgs["properties"]
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

  if (!dataSourceId) {
    return { key: config.key, status: "missing", databaseId: "" };
  }

  if (!hasNotionToken()) {
    return { key: config.key, status: "missing-token", databaseId: dataSourceId };
  }

  try {
    const client = getNotionClient();
    await client.dataSources.query({ data_source_id: dataSourceId, page_size: 1, result_type: "page" });
    return { key: config.key, status: "connected", databaseId: dataSourceId };
  } catch (error) {
    return {
      key: config.key,
      status: "error",
      databaseId: dataSourceId,
      error: error instanceof Error ? error.message : "Unknown Notion error"
    };
  }
}
