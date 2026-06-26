import { cache } from "react";
import { unstable_cache } from "next/cache";
import { fallbackData, getStudioData } from "./site-data";
import type { AdminCollectionKey, AdminRecord, AdminValue } from "./admin/schema";
import { listRecords } from "./admin/content-store";
import { getNotionPageBlocks, hasNotionToken } from "./admin/notion-store";
import type { MediaItem, NotionBlock, SiteSettings, SocialLink, StudioData, Tool, Work, WorkStatus } from "./types";

export const PUBLIC_CONTENT_CACHE_TAG = "public-content";

const placeholderImage = "/figma/pw2-work-image.png";
const aboutPlaceholderImage = "/figma/about-main.png";

export type PublicSection = {
  id: string;
  page: string;
  key: string;
  title: string;
  titleEn: string;
  titleCn: string;
  subtitleEn: string;
  subtitleCn: string;
  bodyEn: string;
  bodyCn: string;
  ctaLabelEn: string;
  ctaLabelCn: string;
  ctaUrl: string;
  mediaUrl: string;
  order: number;
  visible: boolean;
};

export type PublicWorkType = {
  id: string;
  nameEn: string;
  nameCn: string;
  slug: string;
  shortLabel: string;
  descriptionEn: string;
  descriptionCn: string;
  iconUrl: string;
  homeVisible: boolean;
  filterVisible: boolean;
  order: number;
  status: "Published" | "Archived";
  workCount: number;
};

export type PublicExperience = {
  id: string;
  title: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  descriptionEn: string;
  descriptionCn: string;
  tags: string[];
  order: number;
  visible: boolean;
};

export type PublicSkillGroup = {
  id: string;
  groupNameEn: string;
  groupNameCn: string;
  items: string[];
  descriptionEn: string;
  descriptionCn: string;
  order: number;
  visible: boolean;
};

export type PublicContent = {
  settings: SiteSettings;
  sections: PublicSection[];
  works: Work[];
  workTypes: PublicWorkType[];
  tools: Tool[];
  experiences: PublicExperience[];
  skillGroups: PublicSkillGroup[];
  socials: SocialLink[];
  media: AdminRecord[];
  sync: StudioData["sync"] & {
    adminSource?: string;
    errors?: string[];
  };
};

function valueToString(value: AdminValue | undefined) {
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === undefined || value === null) return "";
  return String(value);
}

function text(record: Partial<AdminRecord>, key: string, fallback = "") {
  const value = valueToString(record[key]);
  return value.trim() || fallback;
}

function numberValue(record: Partial<AdminRecord>, key: string, fallback = 0) {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(valueToString(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(record: Partial<AdminRecord>, key: string, fallback = false) {
  const value = record[key];
  if (typeof value === "boolean") return value;
  const stringValue = valueToString(value).toLowerCase();
  if (stringValue === "true") return true;
  if (stringValue === "false") return false;
  return fallback;
}

function parseList(value: string) {
  return value
    .split(/[\n,]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isLikelyNotionId(value: string) {
  return /^[0-9a-f-]{32,36}$/i.test(value);
}

function media(src: string, alt: string, fallback = placeholderImage): MediaItem {
  const safeSrc = src || fallback;
  return {
    type: /\.(mp4|webm)(\?|$)/i.test(safeSrc) ? "video" : "image",
    src: safeSrc,
    alt: alt || "Studio media"
  };
}

async function loadCollectionSafe(key: AdminCollectionKey) {
  try {
    const result = await listRecords(key);
    return { key, source: result.source, items: result.items, error: "" };
  } catch (error) {
    return {
      key,
      source: "fallback" as const,
      items: [] as AdminRecord[],
      error: error instanceof Error ? error.message : `Unable to load ${key}.`
    };
  }
}

function sectionFromRecord(record: AdminRecord): PublicSection {
  return {
    id: record.id,
    page: text(record, "page"),
    key: text(record, "sectionKey"),
    title: text(record, "title"),
    titleEn: text(record, "titleEn"),
    titleCn: text(record, "titleCn"),
    subtitleEn: text(record, "subtitleEn"),
    subtitleCn: text(record, "subtitleCn"),
    bodyEn: text(record, "bodyEn"),
    bodyCn: text(record, "bodyCn"),
    ctaLabelEn: text(record, "ctaLabelEn"),
    ctaLabelCn: text(record, "ctaLabelCn"),
    ctaUrl: text(record, "ctaUrl"),
    mediaUrl: text(record, "mediaUrl"),
    order: numberValue(record, "order", 999),
    visible: booleanValue(record, "visible", true)
  };
}

function workTypesFromRecords(records: AdminRecord[]) {
  return records
    .map((record) => {
      const name = text(record, "nameEn", text(record, "titleEn", "Work Type"));
      const syncStatus = text(record, "syncStatus");
      return {
        id: record.id,
        nameEn: name,
        nameCn: text(record, "nameCn", text(record, "titleCn")),
        slug: text(record, "slug", name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")),
        shortLabel: text(record, "shortLabel", name),
        descriptionEn: text(record, "descriptionEn", text(record, "description")),
        descriptionCn: text(record, "descriptionCn"),
        iconUrl: text(record, "iconUrl", text(record, "icon")),
        homeVisible: syncStatus !== "编辑中",
        filterVisible: syncStatus !== "编辑中",
        order: numberValue(record, "order", 999),
        status: syncStatus === "编辑中" ? "Archived" as const : "Published" as const,
        workCount: 0
      };
    })
    .sort((left, right) => left.order - right.order);
}

function toolsFromRecords(records: AdminRecord[]) {
  return records
    .map((record) => {
      const homeVisible = booleanValue(record, "homeVisible", booleanValue(record, "active", true));
      const status = homeVisible && text(record, "syncStatus") !== "编辑中" ? "Published" as const : "Archived" as const;
      return {
        id: record.id,
        name: text(record, "name", "Tool"),
        category: text(record, "category", "Design"),
        iconUrl: text(record, "iconUrl", text(record, "icon")),
        description: text(record, "descriptionEn"),
        descriptionCn: text(record, "descriptionCn"),
        homeVisible,
        status,
        active: homeVisible && status !== "Archived",
        order: numberValue(record, "order", 999)
      };
    })
    .sort((left, right) => left.order - right.order);
}

function socialsFromRecords(records: AdminRecord[]) {
  return records
    .map((record) => {
      const type = text(record, "type", text(record, "group", "Social")) as SocialLink["group"];
      const active = booleanValue(record, "active", true) && text(record, "syncStatus") !== "编辑中";
      const status = active ? "Published" as const : "Archived" as const;
      return {
        id: record.id,
        platform: text(record, "platform", "Link"),
        label: text(record, "labelEn", text(record, "label", text(record, "platform", "Link"))),
        labelCn: text(record, "labelCn"),
        url: text(record, "url"),
        handle: text(record, "handle"),
        group: type,
        type,
        iconUrl: text(record, "iconUrl"),
        footerVisible: type === "Footer" || type === "Portfolio" || type === "Social",
        contactVisible: type === "Contact" || type === "Portfolio" || type === "Social" || type === "Form",
        status,
        active,
        order: numberValue(record, "order", 999)
      };
    })
    .filter((link) => link.active && link.url)
    .sort((left, right) => left.order - right.order);
}

function resolveRelationList(value: string, labelsById: Map<string, string>) {
  return parseList(value)
    .map((item) => labelsById.get(item) || (!isLikelyNotionId(item) ? item : ""))
    .filter(Boolean);
}

function worksFromRecords(records: AdminRecord[], workTypes: PublicWorkType[], tools: Tool[], fallbackWorks: Work[]) {
  const typeLabels = new Map(workTypes.map((type) => [type.id, type.nameEn]));
  const typeSlugsByName = new Map(workTypes.map((type) => [type.nameEn, type.slug]));
  const toolLabels = new Map(tools.filter((tool) => tool.id).map((tool) => [tool.id as string, tool.name]));
  const fallbackBySlug = new Map(fallbackWorks.map((work) => [work.slug, work]));

  const works = records
    .map((record, index) => {
      const primaryTypeValue = text(record, "primaryType", text(record, "category"));
      const primaryType = resolveRelationList(primaryTypeValue, typeLabels)[0] || primaryTypeValue || "Selected Work";
      const statusValue = text(record, "status", "Draft");
      const status: WorkStatus = text(record, "syncStatus") === "编辑中" ? "Draft" : statusValue === "Published" || statusValue === "Archived" ? statusValue : "Draft";
      const coverUrl = text(record, "coverImage", text(record, "cover"));
      const galleryUrls = parseList(text(record, "galleryImages", text(record, "gallery")));
      const title = text(record, "title", "Untitled Work");
      const slug = text(record, "slug", record.id);
      const fallbackWork = fallbackBySlug.get(slug);
      const publishedAt = text(record, "publishedAt") || fallbackWork?.publishedAt || "";
      const publishedDate = publishedAt ? new Date(publishedAt) : null;
      const year = publishedDate && !Number.isNaN(publishedDate.getTime()) ? publishedDate.getFullYear() : fallbackWork?.year || new Date().getFullYear();
      const dateOrder = publishedDate && !Number.isNaN(publishedDate.getTime()) ? publishedDate.getTime() : 0;

      return {
        id: record.id,
        title,
        slug,
        status,
        year,
        publishedAt,
        viewCount: text(record, "viewCount") ? numberValue(record, "viewCount", fallbackWork?.viewCount || 0) : fallbackWork?.viewCount || 0,
        likeCount: text(record, "likeCount") ? numberValue(record, "likeCount", fallbackWork?.likeCount || 0) : fallbackWork?.likeCount || 0,
        category: primaryType,
        primaryType,
        primaryTypeSlug: typeSlugsByName.get(primaryType) || primaryType.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        tags: parseList(text(record, "tags")).slice(0, 12),
        featured: booleanValue(record, "featured"),
        featuredOrder: dateOrder ? -dateOrder : index + 1,
        order: dateOrder ? -dateOrder : index + 1,
        cover: media(coverUrl, `${title} cover`),
        intro: text(record, "shortIntroEn", text(record, "intro", primaryType)),
        introCn: text(record, "shortIntroCn"),
        overview: text(record, "overviewEn"),
        overviewCn: text(record, "overviewCn"),
        role: text(record, "roleEn", text(record, "role")),
        roleCn: text(record, "roleCn"),
        clientBrand: text(record, "clientBrand"),
        tools: resolveRelationList(text(record, "tools"), toolLabels),
        gallery: (galleryUrls.length > 0 ? galleryUrls : [coverUrl]).filter(Boolean).map((url, galleryIndex) => media(url, `${title} gallery image ${galleryIndex + 1}`)),
        content: fallbackWork?.content || [] as NotionBlock[],
        externalUrl: text(record, "externalUrl"),
        notionUrl: text(record, "notionUrl"),
        notionPageId: record.id
      };
    })
    .filter((work) => work.title && work.slug);

  return works.length > 0 ? works.sort((left, right) => left.order - right.order) : fallbackWorks;
}

function experiencesFromRecords(records: AdminRecord[]) {
  return records
    .map((record) => ({
      id: record.id,
      title: text(record, "title", text(record, "role", "Experience")),
      organization: text(record, "organization", text(record, "company")),
      location: text(record, "location"),
      startDate: text(record, "startDate"),
      endDate: text(record, "endDate"),
      isCurrent: booleanValue(record, "isCurrent"),
      descriptionEn: text(record, "descriptionEn"),
      descriptionCn: text(record, "descriptionCn"),
      tags: parseList(text(record, "tags")),
      order: numberValue(record, "order", 999),
      visible: booleanValue(record, "visible", true)
    }))
    .sort((left, right) => left.order - right.order);
}

function skillGroupsFromRecords(records: AdminRecord[]) {
  return records
    .map((record) => ({
      id: record.id,
      groupNameEn: text(record, "groupNameEn", text(record, "nameEn", "Skills")),
      groupNameCn: text(record, "groupNameCn", text(record, "nameCn")),
      items: parseList(text(record, "items", text(record, "level"))),
      descriptionEn: text(record, "descriptionEn"),
      descriptionCn: text(record, "descriptionCn"),
      order: numberValue(record, "order", 999),
      visible: booleanValue(record, "visible", true)
    }))
    .sort((left, right) => left.order - right.order);
}

function fallbackSections(): PublicSection[] {
  return [
    {
      id: "home-hero",
      page: "Home",
      key: "home_hero",
      title: "Home hero",
      titleEn: fallbackData.settings.homeHeroTitle,
      titleCn: "",
      subtitleEn: fallbackData.settings.homeHeroDescription,
      subtitleCn: "",
      bodyEn: "",
      bodyCn: "",
      ctaLabelEn: "",
      ctaLabelCn: "",
      ctaUrl: "",
      mediaUrl: "",
      order: 1,
      visible: true
    },
    {
      id: "about-intro",
      page: "About",
      key: "about_intro",
      title: "About intro",
      titleEn: "About",
      titleCn: "",
      subtitleEn: "A designer working across digital interfaces, brand visuals, motion content and spatial experiences.",
      subtitleCn: "",
      bodyEn: [
        "and interfaces to brand systems, motion graphics and spatial experiences. I like moving across different mediums, because each project brings a different way to organize information, shape atmosphere and build a visual language.",
        "My work often starts with structure: understanding what needs to be communicated, how people will see it, and what kind of feeling the design should leave behind. From there, I focus on layout, rhythm, details and interaction, trying to make the final result feel clear, refined and purposeful.",
        "I'm interested in design that is not only visually attractive, but also useful and memorable. Whether it is a website, a visual system, a video or a spatial presentation, I hope the work can make ideas easier to understand, while still keeping a sense of atmosphere, emotion and personality."
      ].join("\n\n"),
      bodyCn: "",
      ctaLabelEn: "",
      ctaLabelCn: "",
      ctaUrl: "",
      mediaUrl: aboutPlaceholderImage,
      order: 1,
      visible: true
    }
  ];
}

export function sectionByKey(content: PublicContent, key: string) {
  return content.sections.find((section) => section.key === key && section.visible);
}

export function sectionParagraphs(section: PublicSection | undefined, fallback: string[] = []) {
  const body = section?.bodyEn || "";
  const paragraphs = body.split(/\n{2,}|\r?\n/g).map((item) => item.trim()).filter(Boolean);
  return paragraphs.length > 0 ? paragraphs : fallback;
}

function withWorkTypeCounts(workTypes: PublicWorkType[], works: Work[]) {
  return workTypes.map((type) => ({
    ...type,
    workCount: works.filter((work) => work.status === "Published" && (work.primaryTypeSlug === type.slug || work.primaryType === type.nameEn)).length
  }));
}

async function buildPublicContent(): Promise<PublicContent> {
  const base = await getStudioData();
  const keys: AdminCollectionKey[] = [
    "page-sections",
    "works",
    "work-types",
    "tools",
    "about-experience",
    "about-skills",
    "social-links",
    "media-assets"
  ];
  const loaded = await Promise.all(keys.map(loadCollectionSafe));
  const records = new Map<AdminCollectionKey, AdminRecord[]>();
  const errors = loaded.map((item) => item.error).filter(Boolean);
  for (const result of loaded) records.set(result.key, result.items);

  const sections = records.get("page-sections")?.map(sectionFromRecord).filter((section) => section.key) || fallbackSections();
  const baseHasOssWorks = base.sync.source === "oss" && base.works.length > 0;
  const workTypesFromBase = Array.from(new Map(base.works.map((work) => {
    const name = work.primaryType || work.category || "Selected Work";
    const slug = work.primaryTypeSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return [slug, {
      id: slug,
      nameEn: name,
      nameCn: "",
      slug,
      shortLabel: name,
      descriptionEn: "",
      descriptionCn: "",
      iconUrl: "",
      homeVisible: true,
      filterVisible: true,
      order: 999,
      status: "Published" as const,
      workCount: 0
    }];
  })).values());
  const workTypes = baseHasOssWorks ? workTypesFromBase : workTypesFromRecords(records.get("work-types") || []);
  const tools = toolsFromRecords(records.get("tools") || []);
  const works = baseHasOssWorks ? base.works : worksFromRecords(records.get("works") || [], workTypes, tools, base.works);

  return {
    settings: base.settings,
    sections: sections.length > 0 ? sections.sort((left, right) => left.order - right.order) : fallbackSections(),
    works,
    workTypes: withWorkTypeCounts(workTypes, works),
    tools,
    experiences: experiencesFromRecords(records.get("about-experience") || []),
    skillGroups: skillGroupsFromRecords(records.get("about-skills") || []),
    socials: socialsFromRecords(records.get("social-links") || []),
    media: records.get("media-assets") || [],
    sync: {
      ...base.sync,
      adminSource: loaded.find((item) => item.source !== "fallback")?.source,
      errors
    }
  };
}

const getPublicContentFromCache = unstable_cache(buildPublicContent, ["public-content-v1"], {
  tags: [PUBLIC_CONTENT_CACHE_TAG]
});

export const getPublicContent = cache(getPublicContentFromCache);

async function getNotionPageBlocksSafe(pageId: string) {
  return getNotionPageBlocks(pageId).catch(() => []);
}

const getNotionPageBlocksFromCache = unstable_cache(getNotionPageBlocksSafe, ["public-notion-blocks-v1"], {
  tags: [PUBLIC_CONTENT_CACHE_TAG],
  revalidate: 3600
});

export async function getPublishedWorks() {
  const content = await getPublicContent();
  return content.works.filter((work) => work.status === "Published").sort((left, right) => left.order - right.order);
}

export async function getFeaturedWorks() {
  const works = await getPublishedWorks();
  return works.filter((work) => work.featured).sort((left, right) => (left.featuredOrder || left.order) - (right.featuredOrder || right.order));
}

async function resolveWorkBySlug(slug: string) {
  const content = await getPublicContent();
  const works = content.works.filter((work) => work.status === "Published").sort((left, right) => left.order - right.order);
  const index = works.findIndex((work) => work.slug === slug);
  const work = index >= 0 ? works[index] : undefined;
  if (!work) return null;

  const shouldReadPageBody = hasNotionToken() && work.notionPageId && isLikelyNotionId(work.notionPageId);
  const notionContent = shouldReadPageBody ? await getNotionPageBlocksFromCache(work.notionPageId as string) : [];
  const contentBlocks = notionContent.length > 0 ? notionContent : work.content;

  return {
    work: {
      ...work,
      content: contentBlocks
    },
    previous: works[(index - 1 + works.length) % works.length],
    next: works[(index + 1) % works.length],
    content
  };
}

export const getWorkBySlug = cache(resolveWorkBySlug);

export { placeholderImage, aboutPlaceholderImage };
