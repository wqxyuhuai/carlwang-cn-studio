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

function valueToString(value: AdminValue | undefined) {
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === undefined || value === null) return "";
  return String(value);
}

function hasField(config: AdminCollectionConfig, key: string) {
  return config.fields.some((field) => field.key === key);
}

function firstValue(record: Partial<AdminRecord>, keys: string[]) {
  for (const key of keys) {
    if (!valueIsEmpty(record[key])) return record[key];
  }
  return "";
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
    const requiredGroups = [
      { label: "title", keys: ["title"] },
      { label: "slug", keys: ["slug"] },
      { label: "date", keys: ["publishedAt"] },
      { label: "primaryType", keys: ["primaryType", "category"] },
      { label: "coverImage", keys: ["coverImage", "cover"] }
    ];
    for (const group of requiredGroups) {
      if (valueIsEmpty(firstValue(record, group.keys))) errors.push(`${group.label} is required before publishing.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

function sortRecords(records: AdminRecord[]) {
  return [...records].sort((left, right) => Number(left.order || 999) - Number(right.order || 999));
}

async function loadRawRecords(config: AdminCollectionConfig) {
  const source = collectionSource(config);
  if (source === "notion") return { source, items: await listNotionRecords(config) };
  const store = await readLocalStore();
  return { source, items: sortRecords(store[config.key] || []) };
}

function recordLabel(config: AdminCollectionConfig, record: AdminRecord) {
  return String(record[config.titleField] || record.title || record.name || record.platform || record.id);
}

function recordContainsToken(record: AdminRecord, tokens: string[]) {
  return Object.values(record).some((value) => {
    if (typeof value !== "string") return false;
    return tokens.some((token) => token && value.includes(token));
  });
}

async function assertMediaNotReferenced(record: AdminRecord, store?: AdminStoreData) {
  const tokens = [record.url, record.objectKey].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (tokens.length === 0) return;

  const references: string[] = [];
  const referenceCollections = Object.values(collectionConfigs).filter((config) => config.key !== "media-assets" && config.key !== "contact-messages");
  const localStore = store || await readLocalStore();

  for (const config of referenceCollections) {
    const items = collectionSource(config) === "notion" ? await listNotionRecords(config) : localStore[config.key] || [];
    for (const item of items) {
      if (recordContainsToken(item, tokens)) {
        references.push(`${config.label}: ${recordLabel(config, item)}`);
      }
    }
  }

  if (references.length > 0) {
    throw new Error(`Media asset is still referenced and cannot be deleted. Remove references first: ${references.slice(0, 5).join("; ")}.`);
  }
}

async function assertDeleteAllowed(key: AdminCollectionKey, record: AdminRecord, store?: AdminStoreData) {
  if (record.locked === true) throw new Error("Locked records cannot be deleted. Edit, hide or save them instead.");
  if (key === "media-assets") await assertMediaNotReferenced(record, store);
}

function archivePatchFor(config: AdminCollectionConfig): Partial<AdminRecord> {
  const updatedAt = new Date().toISOString();
  if (hasField(config, "status")) return { status: "Archived", updatedAt };
  if (hasField(config, "visible")) return { visible: false, updatedAt };
  if (hasField(config, "public")) return { public: false, updatedAt };
  return { archived: true, updatedAt };
}

function recordListContains(value: AdminValue | undefined, candidates: string[]) {
  const haystack = valueToString(value).toLowerCase();
  return candidates.some((candidate) => candidate && haystack.includes(candidate.toLowerCase()));
}

function enrichWorkTypes(types: AdminRecord[], works: AdminRecord[]) {
  return types.map((type) => {
    const candidates = [type.id, valueToString(type.nameEn), valueToString(type.titleEn), valueToString(type.slug)].filter(Boolean);
    const workCount = works.filter((work) => {
      if (work.status === "Archived") return false;
      return recordListContains(work.primaryType || work.category, candidates);
    }).length;
    return { ...type, workCount };
  });
}

async function enrichRecords(key: AdminCollectionKey, items: AdminRecord[]) {
  if (key !== "work-types") return items;
  const works = await loadRawRecords(collectionConfigs.works).then((result) => result.items).catch(() => []);
  return enrichWorkTypes(items, works);
}

async function assertUniqueWorkSlug(id: string | undefined, slug: AdminValue | undefined) {
  const normalized = valueToString(slug).trim().toLowerCase();
  if (!normalized) return;

  const { items } = await loadRawRecords(collectionConfigs.works);
  const duplicate = items.find((item) => item.id !== id && valueToString(item.slug).trim().toLowerCase() === normalized && item.status !== "Archived");
  if (duplicate) {
    throw new Error(`Slug must be unique. "${normalized}" is already used by ${recordLabel(collectionConfigs.works, duplicate)}.`);
  }
}

export async function listRecords(key: AdminCollectionKey) {
  const config = collectionConfigs[key];
  const result = await loadRawRecords(config);
  return {
    source: result.source,
    items: await enrichRecords(key, sortRecords(result.items))
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
  if (key === "works") await assertUniqueWorkSlug(undefined, cleaned.slug);
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
  if (key === "works") await assertUniqueWorkSlug(id, cleaned.slug);
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
    const record = (await listNotionRecords(config)).find((item) => item.id === id);
    if (!record) throw new Error("Record not found.");
    await assertDeleteAllowed(key, record);
    if (config.deleteLabel === "Archive") {
      const patch = archivePatchFor(config);
      if (hasField(config, "status") || hasField(config, "visible") || hasField(config, "public")) {
        await updateNotionRecord(config, id, patch);
        return { source };
      }
    }
    await archiveNotionRecord(id);
    return { source };
  }

  const store = await readLocalStore();
  const record = store[key].find((item) => item.id === id);
  if (!record) throw new Error("Record not found.");
  await assertDeleteAllowed(key, record, store);

  if (config.deleteLabel === "Archive") {
    store[key] = store[key].map((item) => (item.id === id ? { ...item, ...archivePatchFor(config) } : item));
  } else {
    store[key] = store[key].filter((item) => item.id !== id);
  }

  await writeLocalStore(store);
  return { source };
}

export async function getDashboardData() {
  const [worksResult, messagesResult, pageSectionsResult, toolsResult, workTypesResult] = await Promise.all([
    listRecords("works").catch(() => ({ source: "local" as const, items: [] })),
    listRecords("contact-messages").catch(() => ({ source: "local" as const, items: [] })),
    listRecords("page-sections").catch(() => ({ source: "local" as const, items: [] })),
    listRecords("tools").catch(() => ({ source: "local" as const, items: [] })),
    listRecords("work-types").catch(() => ({ source: "local" as const, items: [] }))
  ]);
  const works = worksResult.items;
  const messages = messagesResult.items;
  const pageSections = pageSectionsResult.items;
  const tools = toolsResult.items;
  const workTypes = workTypesResult.items;

  return {
    source: process.env.ADMIN_CONTENT_SOURCE === "notion" ? "notion" : "local",
    summary: {
      publishedWorks: works.filter((work) => work.status === "Published").length,
      draftWorks: works.filter((work) => work.status === "Draft").length,
      featuredWorks: works.filter((work) => work.featured === true).length,
      workTypes: workTypes.filter((type) => type.status !== "Archived").length,
      tools: tools.filter((tool) => tool.homeVisible === true || tool.active === true).length,
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
