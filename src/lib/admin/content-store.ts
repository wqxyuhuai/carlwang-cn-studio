import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { adminSeedData, type AdminStoreData } from "./seed";
import { collectionConfigs, getCollectionConfig, type AdminCollectionConfig, type AdminCollectionKey, type AdminRecord, type AdminValue } from "./schema";
import { archiveNotionRecord, createNotionRecord, getDatabaseId, hasNotionToken, listNotionRecords, updateNotionRecord } from "./notion-store";

const localStorePath = path.join(process.cwd(), ".admin", "admin-content.json");

type CollectionSource = "local" | "notion";

function cloneSeed(): AdminStoreData {
  return JSON.parse(JSON.stringify(adminSeedData)) as AdminStoreData;
}

function isRecordArray(value: unknown): value is AdminRecord[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === "object" && "id" in item);
}

async function readLocalStore(): Promise<AdminStoreData> {
  try {
    const raw = await readFile(localStorePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<Record<AdminCollectionKey, unknown>>;
    const merged = cloneSeed();

    for (const key of Object.keys(collectionConfigs) as AdminCollectionKey[]) {
      if (isRecordArray(parsed[key])) {
        merged[key] = parsed[key];
      }
    }

    return merged;
  } catch {
    const seed = cloneSeed();
    await writeLocalStore(seed);
    return seed;
  }
}

async function writeLocalStore(store: AdminStoreData) {
  await mkdir(path.dirname(localStorePath), { recursive: true });
  await writeFile(localStorePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function collectionSource(config: AdminCollectionConfig): CollectionSource {
  if (process.env.ADMIN_CONTENT_SOURCE === "notion" && hasNotionToken() && getDatabaseId(config)) {
    return "notion";
  }

  return "local";
}

export function getCollectionSource(key: AdminCollectionKey): CollectionSource {
  return collectionSource(collectionConfigs[key]);
}

function cleanInput(config: AdminCollectionConfig, input: Partial<AdminRecord>, includeReadOnly = false) {
  const cleaned: Partial<AdminRecord> = {};

  for (const field of config.fields) {
    if (field.readOnly && !includeReadOnly) continue;
    if (!(field.key in input)) continue;
    cleaned[field.key] = normalizeValue(input[field.key], field.type);
  }

  return cleaned;
}

function normalizeValue(value: AdminValue | undefined, type: string): AdminValue {
  if (value === undefined) return "";

  switch (type) {
    case "number":
      return typeof value === "number" ? value : Number(value || 0);
    case "boolean":
      return Boolean(value);
    default:
      if (Array.isArray(value)) return value;
      if (value === null) return "";
      return String(value);
  }
}

function valueIsEmpty(value: AdminValue | undefined) {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function validateRecord(config: AdminCollectionConfig, record: Partial<AdminRecord>, options: { requireRequiredFields?: boolean } = {}) {
  const errors: string[] = [];

  for (const field of config.fields) {
    if (options.requireRequiredFields && field.required && valueIsEmpty(record[field.key])) {
      errors.push(`${field.label} is required.`);
    }

    if (field.type === "select" && !valueIsEmpty(record[field.key]) && field.options && !field.options.includes(String(record[field.key]))) {
      errors.push(`${field.label} must be one of: ${field.options.join(", ")}.`);
    }
  }

  if (options.requireRequiredFields && config.key === "works" && record.status === "Published") {
    for (const key of ["title", "slug", "year", "category", "cover"]) {
      if (valueIsEmpty(record[key])) errors.push(`${key} is required before publishing.`);
    }
    if (valueIsEmpty(record.intro)) errors.push("Short intro is required before publishing.");
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

function sortRecords(records: AdminRecord[]) {
  return [...records].sort((left, right) => Number(left.order || 999) - Number(right.order || 999));
}

export async function listRecords(key: AdminCollectionKey) {
  const config = collectionConfigs[key];
  const source = collectionSource(config);

  if (source === "notion") {
    return {
      source,
      items: await listNotionRecords(config)
    };
  }

  const store = await readLocalStore();
  return {
    source,
    items: sortRecords(store[key] || [])
  };
}

export async function createRecord(key: AdminCollectionKey, input: Partial<AdminRecord>, options: { includeReadOnly?: boolean } = {}) {
  const config = collectionConfigs[key];
  if (!config.allowCreate && !options.includeReadOnly) {
    throw new Error(`${config.label} does not allow manual creation.`);
  }

  const cleaned = cleanInput(config, input, options.includeReadOnly);
  validateRecord(config, cleaned, { requireRequiredFields: true });

  const source = collectionSource(config);
  if (source === "notion") {
    const created = await createNotionRecord(config, cleaned, options.includeReadOnly);
    if (!created) throw new Error("Notion returned an unsupported page response.");
    return { source, item: created };
  }

  const store = await readLocalStore();
  const now = new Date().toISOString();
  const record: AdminRecord = {
    id: input.id && typeof input.id === "string" ? input.id : randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...cleaned
  };

  store[key] = [record, ...(store[key] || [])];
  await writeLocalStore(store);
  return { source, item: record };
}

export async function updateRecord(key: AdminCollectionKey, id: string, input: Partial<AdminRecord>, options: { includeReadOnly?: boolean } = {}) {
  const config = collectionConfigs[key];
  const cleaned = cleanInput(config, input, options.includeReadOnly);
  const source = collectionSource(config);
  if (source === "notion") {
    validateRecord(config, cleaned);
    const updated = await updateNotionRecord(config, id, cleaned, options.includeReadOnly);
    if (!updated) throw new Error("Notion returned an unsupported page response.");
    return { source, item: updated };
  }

  const store = await readLocalStore();
  const index = store[key].findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Record not found.");

  const updated = {
    ...store[key][index],
    ...cleaned,
    id,
    updatedAt: new Date().toISOString()
  };
  validateRecord(config, updated, { requireRequiredFields: true });
  store[key][index] = updated;
  await writeLocalStore(store);
  return { source, item: updated };
}

export async function deleteRecord(key: AdminCollectionKey, id: string) {
  const config = collectionConfigs[key];
  if (!config.allowDelete) {
    throw new Error(`${config.label} does not allow deletion.`);
  }

  const source = collectionSource(config);
  if (source === "notion") {
    await archiveNotionRecord(id);
    return { source };
  }

  const store = await readLocalStore();
  const record = store[key].find((item) => item.id === id);
  if (!record) throw new Error("Record not found.");
  if (record.locked === true) throw new Error("Locked records cannot be deleted.");

  if (config.deleteLabel === "Archive") {
    const archivePatch: Partial<AdminRecord> =
      key === "contact-messages"
        ? { status: "Archived", updatedAt: new Date().toISOString() }
        : { status: "Archived", updatedAt: new Date().toISOString() };
    store[key] = store[key].map((item) => (item.id === id ? { ...item, ...archivePatch } : item));
  } else {
    store[key] = store[key].filter((item) => item.id !== id);
  }

  await writeLocalStore(store);
  return { source };
}

export async function getDashboardData() {
  const store = await readLocalStore();
  const works = store.works || [];
  const messages = store["contact-messages"] || [];
  const pageSections = store["page-sections"] || [];
  const tools = store.tools || [];
  const workTypes = store["work-types"] || [];

  return {
    source: process.env.ADMIN_CONTENT_SOURCE === "notion" ? "notion" : "local",
    summary: {
      publishedWorks: works.filter((work) => work.status === "Published").length,
      draftWorks: works.filter((work) => work.status === "Draft" || work.status === "Ready").length,
      featuredWorks: works.filter((work) => work.featured === true).length,
      workTypes: workTypes.filter((type) => type.status !== "Archived").length,
      tools: tools.filter((tool) => tool.active === true).length,
      newMessages: messages.filter((message) => message.status === "New").length,
      pageSections: pageSections.filter((section) => section.visible === true).length
    },
    recentUpdates: sortRecords([...works, ...pageSections, ...tools].filter((item) => item.updatedAt)).slice(0, 6),
    recentMessages: [...messages]
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
      .slice(0, 5)
  };
}

export function resolveCollectionOrThrow(collection: string) {
  const config = getCollectionConfig(collection);
  if (!config) throw new Error("Unknown admin collection.");
  return config;
}
