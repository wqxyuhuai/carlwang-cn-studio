import { unstable_cache } from "next/cache";
import { PUBLIC_CONTENT_CACHE_TAG, PUBLIC_CONTENT_REVALIDATE_SECONDS } from "./cache-tags";
import type { Experience, MediaItem, NotionBlock, SocialLink, StudioData, Tool, Work, WorkType } from "./types";

export const CONTENT_URL =
  process.env.NEXT_PUBLIC_CONTENT_URL ||
  "https://carlwang-cn-studio.oss-cn-shanghai.aliyuncs.com/uploads/admin/site-content.json";

const image = (src: string, alt: string, caption?: string): MediaItem => ({
  type: "image",
  src,
  alt,
  caption
});

const referenceImages = {
  a11: image("/figma/pw2-work-image.png", "PW2 Figma selected work visual"),
  a14: image("/figma/pw2-work-image.png", "PW2 Figma selected work visual"),
  a21: image("/figma/pw2-work-image.png", "PW2 Figma selected work visual"),
  b11: image("/figma/pw2-work-image.png", "PW2 Figma selected work visual"),
  c11: image("/figma/pw2-work-image.png", "PW2 Figma selected work visual"),
  c12: image("/figma/pw2-work-image.png", "PW2 Figma selected work visual"),
  c13: image("/figma/pw2-work-image.png", "PW2 Figma selected work visual"),
  c14: image("/figma/pw2-work-image.png", "PW2 Figma selected work visual"),
  c15: image("/figma/pw2-work-image.png", "PW2 Figma selected work visual")
};

const bodyBlocks: NotionBlock[] = [
  {
    type: "heading_2",
    text: [{ text: "System first, image rhythm second" }]
  },
  {
    type: "paragraph",
    text: [
      {
        text: "The detail body is shaped for Notion block rendering: text, image, columns, captions, links and fallback states stay structured before final OSS sync."
      }
    ]
  },
  {
    type: "column_list",
    columns: [
      [
        {
          type: "image",
          media: referenceImages.c12
        }
      ],
      [
        {
          type: "quote",
          text: [{ text: "A clear visual system should make a strong screen repeatable." }]
        },
        {
          type: "paragraph",
          text: [
            {
              text: "This mock block keeps the renderer honest while the real Project page body remains in Notion."
            }
          ]
        }
      ]
    ]
  }
];

export const fallbackWorks: Work[] = [
  {
    id: "studio-web-system",
    title: "Studio Web System",
    slug: "studio-web-system",
    status: "Published",
    year: 2026,
    publishedAt: "2026-03-12",
    viewCount: 255,
    likeCount: 255,
    category: "Website",
    featured: true,
    order: 1,
    cover: referenceImages.b11,
    intro: "A static front end with OSS content, Notion detail bodies and a future protected sync console.",
    role: "Design system, web direction, frontend",
    tools: ["Figma", "Bebas Neue", "SF Pro", "Web"],
    gallery: [referenceImages.b11, referenceImages.a14, referenceImages.c13],
    content: bodyBlocks
  },
  {
    id: "brand-motion-language",
    title: "Brand Motion Language",
    slug: "brand-motion-language",
    status: "Published",
    year: 2026,
    publishedAt: "2026-01-18",
    viewCount: 255,
    likeCount: 255,
    category: "Motion",
    featured: true,
    order: 2,
    cover: referenceImages.a11,
    intro: "A compact motion-led identity system for launch pages, campaign visuals and screen rhythm.",
    role: "Visual direction, motion system",
    tools: ["Figma", "After Effects", "Photoshop"],
    gallery: [referenceImages.a11, referenceImages.c11, referenceImages.c14],
    content: bodyBlocks
  },
  {
    id: "interface-direction-kit",
    title: "Interface Direction Kit",
    slug: "interface-direction-kit",
    status: "Published",
    year: 2025,
    publishedAt: "2025-08-20",
    viewCount: 255,
    likeCount: 255,
    category: "UI Product",
    featured: true,
    order: 3,
    cover: referenceImages.c14,
    intro: "A product-facing design kit for typography, states, rhythm and admin surfaces.",
    role: "Interface direction, component rules",
    tools: ["Figma", "SF Pro", "Web"],
    gallery: [referenceImages.c14, referenceImages.c15],
    content: bodyBlocks
  },
  {
    id: "visual-identity-refresh",
    title: "Visual Identity Refresh",
    slug: "visual-identity-refresh",
    status: "Published",
    year: 2025,
    publishedAt: "2025-05-06",
    viewCount: 255,
    likeCount: 255,
    category: "Brand",
    featured: false,
    order: 4,
    cover: referenceImages.c12,
    intro: "A restrained identity refresh built around hard edges, motion-friendly rules and digital use.",
    role: "Brand system, art direction",
    tools: ["Illustrator", "Photoshop", "Figma"],
    gallery: [referenceImages.c12, referenceImages.a21],
    content: bodyBlocks
  },
  {
    id: "render-experiments",
    title: "Render Experiments",
    slug: "render-experiments",
    status: "Published",
    year: 2024,
    publishedAt: "2024-09-14",
    viewCount: 255,
    likeCount: 255,
    category: "3D Render",
    featured: false,
    order: 5,
    cover: referenceImages.c15,
    intro: "A short visual study for render-led storytelling and spatial presentation.",
    role: "Concept, render direction",
    tools: ["Blender", "Figma"],
    gallery: [referenceImages.c15, referenceImages.c11],
    content: bodyBlocks
  },
  {
    id: "campaign-image-system",
    title: "Campaign Image System",
    slug: "campaign-image-system",
    status: "Draft",
    year: 2024,
    publishedAt: "2024-02-08",
    viewCount: 0,
    likeCount: 0,
    category: "Campaign",
    featured: false,
    order: 6,
    cover: referenceImages.c11,
    intro: "A draft image system entry kept hidden from published routes.",
    role: "Asset system",
    tools: ["Photoshop", "Figma"],
    gallery: [referenceImages.c11],
    content: bodyBlocks
  }
];

const fallbackTools: Tool[] = [
  { name: "Figma", category: "Design", active: true, order: 1 },
  { name: "Bebas Neue", category: "Font", active: true, order: 2 },
  { name: "SF Pro", category: "Font", active: true, order: 3 },
  { name: "Photoshop", category: "Design", active: true, order: 4 },
  { name: "Illustrator", category: "Design", active: true, order: 5 },
  { name: "After Effects", category: "Motion", active: true, order: 6 },
  { name: "Blender", category: "3D", active: true, order: 7 }
];

function slugFromLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const fallbackWorkTypes: WorkType[] = Array.from(
  new Map(
    fallbackWorks.map((work, index) => {
      const name = work.primaryType || work.category || "Selected Work";
      const slug = work.primaryTypeSlug || slugFromLabel(name);
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
        order: index + 1,
        status: "Published" as const,
        workCount: 0
      }];
    })
  ).values()
);

export const fallbackSocials: SocialLink[] = [
  { platform: "Email", label: "Email", url: "mailto:wqxyuhuai@163.com", handle: "wqxyuhuai@163.com", group: "Contact", active: true, order: 1 },
  { platform: "Behance", label: "Behance", url: "https://www.behance.net/", group: "Portfolio", active: true, order: 2 },
  { platform: "Zcool", label: "Zcool", url: "https://www.zcool.com.cn/", group: "Portfolio", active: true, order: 3 },
  { platform: "Xiaohongshu", label: "Xiaohongshu", url: "https://www.xiaohongshu.com/", group: "Social", active: true, order: 4 }
];

export const fallbackData: StudioData = {
  settings: {
    designUrl: "https://www.figma.com/site/a9YgWrt2FRnQmRwLgNSUlh/PW2?node-id=0-1",
    previewUrl: "https://sport-sale-19959896.figma.site/",
    contentUrl: CONTENT_URL,
    homeHeroTitle: "Designing clarity for complex systems.",
    homeHeroDescription: "Designer / Product Thinker / Creative Builder",
    seoTitle: "Carl Wang Studio",
    seoDescription: "A designer working across visual, digital and spatial systems."
  },
  works: fallbackWorks,
  workTypes: fallbackWorkTypes,
  tools: fallbackTools,
  socials: fallbackSocials,
  experiences: [],
  sync: {
    source: "fallback",
    error: "Using fallback content until OSS JSON is normalized for PW2."
  }
};

type LooseWork = Partial<Work> & {
  coverImage?: MediaItem;
};

type OssRichContentBlock = {
  type?: string;
  value?: string;
  caption?: string;
  columns?: OssRichContentBlock[][];
};

type OssProject = {
  id?: string;
  slug?: string;
  title?: string;
  category?: string;
  year?: number | string;
  content?: string;
  richContent?: OssRichContentBlock[];
  coverImage?: string;
  galleryImages?: string[];
  videoUrl?: string;
  status?: string;
  featured?: boolean;
  sortOrder?: number | string;
};

type OssProjectData = {
  projects?: OssProject[];
  settings?: Partial<Record<string, string>>;
  socials?: unknown[];
  capabilities?: unknown[];
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

function mediaFromUrl(src: string, alt: string, caption?: string): MediaItem {
  return {
    type: /\.(mp4|webm)(\?|$)/i.test(src) ? "video" : "image",
    src: proxiedOssUrl(src),
    alt,
    caption
  };
}

function normalizeMedia(value: unknown, alt: string): MediaItem | null {
  if (typeof value === "string" && value) return mediaFromUrl(value, alt);
  if (!value || typeof value !== "object") return null;
  const media = value as Partial<MediaItem>;
  if (!media.src) return null;
  return {
    type: media.type === "video" || /\.(mp4|webm)(\?|$)/i.test(media.src) ? "video" : "image",
    src: proxiedOssUrl(media.src),
    alt: media.alt || alt,
    caption: media.caption,
    poster: media.poster ? proxiedOssUrl(media.poster) : undefined,
    spriteSrc: media.spriteSrc ? proxiedOssUrl(media.spriteSrc) : undefined,
    spriteFrameCount: media.spriteFrameCount,
    spriteColumns: media.spriteColumns,
    spriteRows: media.spriteRows,
    duration: media.duration,
    mutedDefault: media.mutedDefault,
    width: media.width,
    height: media.height
  };
}

function normalizeNotionBlocks(value: unknown): NotionBlock[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeNotionBlock).filter((block): block is NotionBlock => Boolean(block));
}

function normalizeNotionBlock(value: unknown): NotionBlock | null {
  if (!value || typeof value !== "object") return null;
  const block = value as NotionBlock;
  if (block.type === "image" || block.type === "video") {
    const media = normalizeMedia(block.media, `Notion ${block.type}`);
    return media ? { ...block, media } : null;
  }
  if (block.type === "column_list") {
    return {
      type: "column_list",
      columns: Array.isArray(block.columns) ? block.columns.map((column) => normalizeNotionBlocks(column)) : []
    };
  }
  if (block.type === "toggle") {
    return {
      ...block,
      children: normalizeNotionBlocks(block.children)
    };
  }
  return block;
}

async function readJsonUrl(url: string) {
  if (!url) return null;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Work content request failed with status ${response.status}`);
  return await response.json();
}

const readWorkContentJson = unstable_cache(readJsonUrl, ["work-content-json-v4"], {
  tags: [PUBLIC_CONTENT_CACHE_TAG],
  revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS
});

export async function getWorkContent(work: Work): Promise<NotionBlock[]> {
  if (work.content.length > 0) return work.content;
  if (!work.contentUrl) return [];
  try {
    const json = await readWorkContentJson(work.contentUrl);
    if (!json || typeof json !== "object") return [];
    const candidate = json as { blocks?: unknown; content?: unknown };
    return normalizeNotionBlocks(candidate.blocks || candidate.content);
  } catch (error) {
    console.error(`[public-content] Failed to load work content for ${work.slug}`, error);
    return [];
  }
}

function richContentToBlocks(blocks: OssRichContentBlock[] | undefined, title: string): NotionBlock[] {
  if (!Array.isArray(blocks)) return [];

  return blocks.flatMap((block, index): NotionBlock[] => {
    const value = typeof block.value === "string" ? block.value : "";
    const caption = typeof block.caption === "string" ? block.caption : undefined;

    if ((block.type === "image" || block.type === "video") && value) {
      return [{ type: block.type, media: mediaFromUrl(value, `${title} media ${index + 1}`, caption) }];
    }

    if (block.type === "columns" && Array.isArray(block.columns)) {
      return [
        {
          type: "column_list",
          columns: block.columns.map((column) => richContentToBlocks(column, title))
        }
      ];
    }

    if (block.type === "paragraph" && value) {
      return [{ type: "paragraph", text: [{ text: value }] }];
    }

    return [];
  });
}

function normalizeStatus(value: string | undefined): Work["status"] {
  if (value === "Published" || value === "Archived" || value === "Draft") return value;
  return "Published";
}

function normalizeProject(value: OssProject): Work | null {
  if (!value || !value.title || !value.slug || !value.coverImage) return null;

  const title = value.title;
  const cover = mediaFromUrl(value.coverImage, `${title} cover`);
  const gallery = [
    ...(value.videoUrl ? [mediaFromUrl(value.videoUrl, `${title} video`)] : []),
    ...(Array.isArray(value.galleryImages) ? value.galleryImages.map((url, index) => mediaFromUrl(url, `${title} gallery image ${index + 1}`)) : [])
  ];

  return {
    id: value.id || value.slug,
    title,
    slug: value.slug,
    status: normalizeStatus(value.status),
    year: Number(value.year || new Date().getFullYear()),
    viewCount: 0,
    likeCount: 0,
    category: value.category || "Selected Work",
    primaryType: value.category || "Selected Work",
    primaryTypeSlug: (value.category || "selected-work").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    featured: Boolean(value.featured),
    order: Number(value.sortOrder || 999),
    cover,
    intro: value.content || value.category || "",
    role: "",
    tools: [],
    gallery: gallery.length > 0 ? gallery : [cover],
    content: richContentToBlocks(value.richContent, title),
    contentUrl: undefined,
    notionPageId: value.id
  };
}

function lookupKey(value: string | undefined) {
  return (value || "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

function mergeAliyunProjectBody(work: Work, projectsBySlug: Map<string, Work>, projectsByTitle: Map<string, Work>): Work {
  const project = projectsBySlug.get(work.slug) || projectsByTitle.get(lookupKey(work.title));
  if (!project) return work;

  const hasContent = work.content.length > 0;
  const hasUsefulGallery = work.gallery.length > 1;

  return {
    ...work,
    gallery: hasUsefulGallery || project.gallery.length === 0 ? work.gallery : project.gallery,
    content: work.contentUrl || hasContent || project.content.length === 0 ? work.content : project.content
  };
}

function normalizeWork(value: unknown): Work | null {
  if (!value || typeof value !== "object") return null;
  const work = value as LooseWork;
  const title = work.title || "";
  const cover = normalizeMedia(work.cover || work.coverImage, `${title} cover`);

  if (!title || !work.slug || !work.status || !work.year || !work.category || !cover) return null;

  return {
    id: work.id || work.slug,
    title,
    slug: work.slug,
    status: work.status,
    year: Number(work.year),
    publishedAt: typeof work.publishedAt === "string" ? work.publishedAt : undefined,
    viewCount: Number(work.viewCount || 0),
    likeCount: Number(work.likeCount || 0),
    category: work.category,
    primaryType: work.primaryType || work.category,
    primaryTypeSlug: work.primaryTypeSlug || slugFromLabel(work.primaryType || work.category),
    tags: Array.isArray(work.tags) ? work.tags : [],
    featured: Boolean(work.featured),
    featuredOrder: Number(work.featuredOrder || work.order || 999),
    order: Number(work.order || 999),
    cover,
    intro: work.intro || "",
    introCn: work.introCn,
    overview: work.overview,
    overviewCn: work.overviewCn,
    role: work.role || "",
    roleCn: work.roleCn,
    clientBrand: work.clientBrand,
    tools: work.tools || [],
    gallery: (work.gallery || [cover]).map((item, index) => normalizeMedia(item, `${title} gallery image ${index + 1}`)).filter((item): item is MediaItem => Boolean(item)),
    content: normalizeNotionBlocks(work.content || []),
    contentUrl: typeof work.contentUrl === "string" ? work.contentUrl : undefined,
    externalUrl: work.externalUrl,
    notionUrl: work.notionUrl,
    notionPageId: work.notionPageId
  };
}

function stringFromUnknown(value: unknown) {
  return typeof value === "string" ? value : "";
}

function booleanFromUnknown(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeWorkType(value: unknown): WorkType | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<WorkType> & {
    name?: string;
    title?: string;
    label?: string;
    cover?: string;
  };
  const name = stringFromUnknown(record.nameEn) || stringFromUnknown(record.name) || stringFromUnknown(record.title) || stringFromUnknown(record.label);
  if (!name) return null;
  const slug = stringFromUnknown(record.slug) || slugFromLabel(name);

  return {
    id: stringFromUnknown(record.id) || slug,
    nameEn: name,
    nameCn: stringFromUnknown(record.nameCn),
    slug,
    shortLabel: stringFromUnknown(record.shortLabel) || name,
    descriptionEn: stringFromUnknown(record.descriptionEn),
    descriptionCn: stringFromUnknown(record.descriptionCn),
    iconUrl: proxiedOssUrl(stringFromUnknown(record.iconUrl) || stringFromUnknown(record.cover)),
    homeVisible: booleanFromUnknown(record.homeVisible, true),
    filterVisible: booleanFromUnknown(record.filterVisible, true),
    order: Number(record.order || 999),
    status: record.status === "Archived" ? "Archived" : "Published",
    workCount: Number(record.workCount || 0)
  };
}

function normalizeTool(value: unknown): Tool | null {
  if (!value || typeof value !== "object") return null;
  const tool = value as Partial<Tool>;
  if (!tool.name) return null;
  const active = tool.active !== false && tool.status !== "Archived";
  return {
    id: tool.id,
    name: tool.name,
    category: tool.category || "Design",
    iconUrl: tool.iconUrl ? proxiedOssUrl(tool.iconUrl) : "",
    description: tool.description || "",
    descriptionCn: tool.descriptionCn || "",
    homeVisible: tool.homeVisible !== false,
    status: active ? "Published" : "Archived",
    active,
    order: Number(tool.order || 999)
  };
}

function normalizeSocial(value: unknown): SocialLink | null {
  if (!value || typeof value !== "object") return null;
  const social = value as Partial<SocialLink> & { name?: string; href?: string; icon?: string };
  const legacyPlatform = typeof social.name === "string" ? social.name.trim() : "";
  const legacyHref = typeof social.href === "string" ? social.href.trim() : "";
  const platform = social.platform || legacyPlatform;
  const url = social.url || legacyHref;
  if (!platform || !url) return null;
  const group = social.group || social.type || "Social";
  const active = social.active !== false && social.status !== "Archived";
  const legacyKey = `${platform}|${social.icon || ""}`.toLowerCase();
  const legacyAssets = legacySocialPresentation(legacyKey);
  return {
    id: social.id,
    platform,
    label: social.label || platform,
    labelCn: social.labelCn,
    url,
    handle: social.handle,
    group,
    type: social.type || group,
    cardImageUrl: social.cardImageUrl ? proxiedOssUrl(social.cardImageUrl) : legacyAssets.cardImageUrl,
    iconUrl: social.iconUrl ? proxiedOssUrl(social.iconUrl) : legacyAssets.iconUrl,
    colorIconUrl: social.colorIconUrl ? proxiedOssUrl(social.colorIconUrl) : legacyAssets.colorIconUrl,
    lightColorIconUrl: social.lightColorIconUrl ? proxiedOssUrl(social.lightColorIconUrl) : legacyAssets.lightColorIconUrl,
    footerIconUrl: social.footerIconUrl ? proxiedOssUrl(social.footerIconUrl) : legacyAssets.footerIconUrl,
    cardBackgroundColor: social.cardBackgroundColor || legacyAssets.cardBackgroundColor,
    cardLogoColor: social.cardLogoColor || legacyAssets.cardLogoColor,
    footerVisible: social.footerVisible ?? (group === "Footer" || group === "Portfolio" || group === "Social"),
    contactVisible: social.contactVisible ?? (group === "Contact" || group === "Portfolio" || group === "Social" || group === "Form"),
    status: active ? "Published" : "Archived",
    active,
    order: Number(social.order || legacyAssets.order || 999)
  };
}

function legacySocialPresentation(key: string) {
  switch (key) {
    case "behance|palette":
      return {
        cardImageUrl: "/figma/social-behance.svg",
        iconUrl: "/figma/social-behance.svg",
        colorIconUrl: "/figma/social-color-behance.svg",
        footerIconUrl: "/figma/social-icon-behance.svg",
        cardBackgroundColor: "#2952fb",
        cardLogoColor: "#ffffff",
        order: 1
      };
    case "zcool|brush":
      return {
        cardImageUrl: "/figma/social-zcool.svg",
        iconUrl: "/figma/social-zcool.svg",
        colorIconUrl: "/figma/social-color-zcool.svg",
        footerIconUrl: "/figma/social-icon-zcool.svg",
        cardBackgroundColor: "#f5ca1e",
        cardLogoColor: "#040000",
        order: 2
      };
    case "xiaohongshu|bookopen":
      return {
        cardImageUrl: "/figma/social-xiaohongshu.svg",
        iconUrl: "/figma/social-xiaohongshu.svg",
        colorIconUrl: "/figma/social-color-xiaohongshu.svg",
        footerIconUrl: "/figma/social-icon-xiaohongshu.svg",
        cardBackgroundColor: "#ff2e4d",
        cardLogoColor: "#ffffff",
        order: 3
      };
    case "github|github":
      return {
        cardImageUrl: "/figma/social-github.svg",
        iconUrl: "/figma/social-github.svg",
        colorIconUrl: "/figma/social-color-github.svg",
        lightColorIconUrl: "/figma/social-color-github-light.svg",
        footerIconUrl: "/figma/social-icon-github.svg",
        cardBackgroundColor: "#202328",
        cardLogoColor: "#ffffff",
        order: 4
      };
    case "linkedin|linkedin":
      return {
        cardImageUrl: "/figma/social-linkedin.svg",
        iconUrl: "/figma/social-linkedin.svg",
        colorIconUrl: "/figma/social-color-linkedin.svg",
        footerIconUrl: "/figma/social-icon-linkedin.svg",
        cardBackgroundColor: "#156da0",
        cardLogoColor: "#ffffff",
        order: 5
      };
    case "email|mail":
      return {
        cardImageUrl: "/figma/social-email.svg",
        iconUrl: "/figma/social-email.svg",
        colorIconUrl: "/figma/social-color-email.svg",
        lightColorIconUrl: "/figma/social-color-email-light.svg",
        footerIconUrl: "/figma/social-icon-email.svg",
        cardBackgroundColor: "#7c7979",
        cardLogoColor: "#ffffff",
        order: 6
      };
    default:
      return {
        cardImageUrl: "",
        iconUrl: "",
        colorIconUrl: "",
        lightColorIconUrl: "",
        footerIconUrl: "",
        cardBackgroundColor: "",
        cardLogoColor: "",
        order: 999
      };
  }
}

function normalizeExperience(value: unknown): Experience | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Experience>;
  if (!item.title) return null;
  return {
    id: item.id || slugFromLabel(item.title),
    title: item.title,
    organization: item.organization || "",
    location: item.location || "",
    startDate: item.startDate || "",
    endDate: item.endDate || "",
    dateLabel: item.dateLabel || "",
    isCurrent: Boolean(item.isCurrent),
    descriptionEn: item.descriptionEn || "",
    descriptionCn: item.descriptionCn || "",
    tags: Array.isArray(item.tags) ? item.tags : [],
    imageUrl: item.imageUrl ? proxiedOssUrl(item.imageUrl) : "",
    order: Number(item.order || 999),
    visible: item.visible !== false
  };
}

function isStudioData(value: unknown): value is StudioData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StudioData>;
  return Array.isArray(candidate.works) && Boolean(candidate.settings);
}

type StudioDataWithAliyunProjects = StudioData & {
  projects?: OssProject[];
};

function normalizeProjectData(value: unknown): StudioData | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as OssProjectData;
  if (!Array.isArray(candidate.projects)) return null;

  const works = candidate.projects.map(normalizeProject).filter((work): work is Work => Boolean(work));
  if (works.length === 0) return null;

  const settings = candidate.settings || {};

  return {
    ...fallbackData,
    settings: {
      ...fallbackData.settings,
      homeHeroTitle: settings.slogan || fallbackData.settings.homeHeroTitle,
      homeHeroDescription: settings.role || fallbackData.settings.homeHeroDescription,
      seoTitle: settings.name ? `${settings.name} Studio` : fallbackData.settings.seoTitle,
      seoDescription: settings.bio || fallbackData.settings.seoDescription,
      contactEmail: settings.email || fallbackData.settings.contactEmail,
      footerCopyright: settings.footer || fallbackData.settings.footerCopyright,
      contentUrl: CONTENT_URL
    },
    works: works.sort((a, b) => a.order - b.order),
    sync: { source: "oss" }
  };
}

export async function getStudioData(): Promise<StudioData> {
  try {
    const response = await fetch(CONTENT_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`OSS responded ${response.status}`);
    const json = (await response.json()) as unknown;

    if (isStudioData(json)) {
      const studioJson = json as StudioDataWithAliyunProjects;
      const aliyunProjects = Array.isArray(studioJson.projects)
        ? studioJson.projects.map(normalizeProject).filter((work): work is Work => Boolean(work))
        : [];
      const projectsBySlug = new Map(aliyunProjects.map((work) => [work.slug, work]));
      const projectsByTitle = new Map(aliyunProjects.map((work) => [lookupKey(work.title), work]));
      const normalizedWorks = json.works.map(normalizeWork).filter((work): work is Work => Boolean(work));
      const mergedWorks = normalizedWorks.map((work) => mergeAliyunProjectBody(work, projectsBySlug, projectsByTitle));
      const works = mergedWorks.length > 0 ? mergedWorks : fallbackData.works;
      const normalizedWorkTypes = (json.workTypes || fallbackData.workTypes || [])
        .map(normalizeWorkType)
        .filter((workType): workType is WorkType => Boolean(workType));
      const normalizedTools = (json.tools || fallbackData.tools)
        .map(normalizeTool)
        .filter((tool): tool is Tool => Boolean(tool));
      const normalizedSocials = (json.socials || fallbackData.socials)
        .map(normalizeSocial)
        .filter((social): social is SocialLink => Boolean(social));
      const normalizedExperiences = (json.experiences || fallbackData.experiences || [])
        .map(normalizeExperience)
        .filter((experience): experience is Experience => Boolean(experience));

      return {
        ...fallbackData,
        ...json,
        works: works.sort((a, b) => a.order - b.order),
        workTypes: normalizedWorkTypes.sort((a, b) => a.order - b.order),
        tools: normalizedTools.sort((a, b) => a.order - b.order),
        socials: normalizedSocials.sort((a, b) => a.order - b.order),
        experiences: normalizedExperiences.sort((a, b) => a.order - b.order),
        sync: { source: "oss" }
      };
    }

    const projectData = normalizeProjectData(json);
    if (projectData) return projectData;

    throw new Error("OSS JSON shape does not match PW2 StudioData.");
  } catch (error) {
    return {
      ...fallbackData,
      sync: {
        source: "fallback",
        error: error instanceof Error ? error.message : "Unknown OSS read error"
      }
    };
  }
}

export async function getPublishedWorks() {
  const data = await getStudioData();
  return data.works.filter((work) => work.status === "Published").sort((a, b) => a.order - b.order);
}

export async function getWorkBySlug(slug: string) {
  const works = await getPublishedWorks();
  return works.find((work) => work.slug === slug);
}
