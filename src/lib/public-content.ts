import { cache } from "react";
import { unstable_cache } from "next/cache";
import { fallbackData, getStudioData, getWorkContent } from "./site-data";
import { PUBLIC_CONTENT_CACHE_TAG } from "./cache-tags";
import type { SiteSettings, SocialLink, StudioData, Tool, Work, WorkType } from "./types";
import { applyWorkViewCounts } from "./work-view-counts";

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
  dateLabel: string;
  isCurrent: boolean;
  descriptionEn: string;
  descriptionCn: string;
  tags: string[];
  imageUrl: string;
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
  media: [];
  sync: StudioData["sync"] & {
    adminSource?: string;
    errors?: string[];
  };
};

function proxiedOssUrl(src: string) {
  try {
    const url = new URL(src);
    if (/^[a-z0-9-]+\.oss-[a-z0-9-]+\.aliyuncs\.com$/i.test(url.hostname)) {
      return `/api/media/oss?url=${encodeURIComponent(src)}`;
    }
  } catch {
    return src;
  }
  return src;
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
        "I鈥檓 a designer who enjoys working between different forms of visual expression 鈥?from websites and interfaces to brand systems, motion graphics and spatial experiences. I like moving across different mediums, because each project brings a different way to organize information, shape atmosphere and build a visual language.",
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

function workTypesFromWorks(works: Work[]) {
  return Array.from(new Map(works.map((work) => {
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
}

function workTypesFromOssData(workTypes: WorkType[] | undefined) {
  return (workTypes || [])
    .map((type) => {
      const name = type.nameEn || type.shortLabel || "Work Type";
      const slug = type.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return {
        id: type.id || slug,
        nameEn: name,
        nameCn: type.nameCn || "",
        slug,
        shortLabel: type.shortLabel || name,
        descriptionEn: type.descriptionEn || "",
        descriptionCn: type.descriptionCn || "",
        iconUrl: proxiedOssUrl(type.iconUrl || ""),
        homeVisible: type.homeVisible !== false,
        filterVisible: type.filterVisible !== false,
        order: Number(type.order || 999),
        status: type.status === "Archived" ? "Archived" as const : "Published" as const,
        workCount: Number(type.workCount || 0)
      };
    })
    .sort((left, right) => left.order - right.order);
}

async function buildPublicContent(): Promise<PublicContent> {
  const base = await getStudioData();
  const baseHasOssWorks = base.sync.source === "oss" && base.works.length > 0;
  const workTypesFromOss = workTypesFromOssData(base.workTypes);
  const workTypes = workTypesFromOss.length > 0 ? workTypesFromOss : workTypesFromWorks(base.works);
  const works = await applyWorkViewCounts(baseHasOssWorks ? base.works : fallbackData.works);

  return {
    settings: base.settings,
    sections: fallbackSections(),
    works,
    workTypes: withWorkTypeCounts(workTypes, works),
    tools: base.tools,
    experiences: (base.experiences || []).map((item) => ({
      id: item.id,
      title: item.title,
      organization: item.organization,
      location: item.location || "",
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      dateLabel: item.dateLabel || "",
      isCurrent: Boolean(item.isCurrent),
      descriptionEn: item.descriptionEn || "",
      descriptionCn: item.descriptionCn || "",
      tags: item.tags || [],
      imageUrl: item.imageUrl || "",
      order: item.order,
      visible: item.visible
    })).filter((item) => item.visible).sort((left, right) => left.order - right.order),
    skillGroups: [],
    socials: base.socials.filter((link) => link.active && link.url),
    media: [],
    sync: {
      ...base.sync
    }
  };
}

const getPublicContentFromCache = unstable_cache(buildPublicContent, ["public-content-v12"], {
  revalidate: 60,
  tags: [PUBLIC_CONTENT_CACHE_TAG]
});

export const getPublicContent = cache(getPublicContentFromCache);

export async function getPublishedWorks() {
  const content = await getPublicContent();
  return content.works.filter((work) => work.status === "Published").sort((left, right) => left.order - right.order);
}

async function resolveWorkBySlug(slug: string) {
  const content = await getPublicContent();
  const works = content.works.filter((work) => work.status === "Published").sort((left, right) => left.order - right.order);
  const index = works.findIndex((work) => work.slug === slug);
  const work = index >= 0 ? works[index] : undefined;
  if (!work) return null;

  return {
    work: {
      ...work,
      content: await getWorkContent(work)
    },
    previous: works[(index - 1 + works.length) % works.length],
    next: works[(index + 1) % works.length],
    content
  };
}

export const getWorkBySlug = cache(resolveWorkBySlug);

export { placeholderImage, aboutPlaceholderImage };
