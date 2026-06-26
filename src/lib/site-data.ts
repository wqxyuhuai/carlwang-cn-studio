import type { MediaItem, NotionBlock, SocialLink, StudioData, Tool, Work } from "./types";

export const CONTENT_URL =
  process.env.NEXT_PUBLIC_CONTENT_URL ||
  "https://carlwang-cn.oss-cn-shanghai.aliyuncs.com/uploads/site-content.json";

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

export const fallbackSocials: SocialLink[] = [
  { platform: "Email", label: "Email", url: "mailto:hello@carlwang.cn", handle: "hello@carlwang.cn", group: "Contact", active: true, order: 1 },
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
  tools: fallbackTools,
  socials: fallbackSocials,
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

function mediaFromUrl(src: string, alt: string, caption?: string): MediaItem {
  return {
    type: /\.(mp4|webm)(\?|$)/i.test(src) ? "video" : "image",
    src,
    alt,
    caption
  };
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
    notionPageId: value.id
  };
}

function normalizeWork(value: unknown): Work | null {
  if (!value || typeof value !== "object") return null;
  const work = value as LooseWork;
  const cover = work.cover || work.coverImage;

  if (!work.title || !work.slug || !work.status || !work.year || !work.category || !cover) return null;

  return {
    id: work.id || work.slug,
    title: work.title,
    slug: work.slug,
    status: work.status,
    year: Number(work.year),
    publishedAt: typeof work.publishedAt === "string" ? work.publishedAt : undefined,
    viewCount: Number(work.viewCount || 0),
    likeCount: Number(work.likeCount || 0),
    category: work.category,
    featured: Boolean(work.featured),
    order: Number(work.order || 999),
    cover,
    intro: work.intro || "",
    role: work.role || "",
    tools: work.tools || [],
    gallery: work.gallery || [cover],
    content: work.content || []
  };
}

function isStudioData(value: unknown): value is StudioData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StudioData>;
  return Array.isArray(candidate.works) && Boolean(candidate.settings);
}

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
    const response = await fetch(CONTENT_URL, { cache: "force-cache" });
    if (!response.ok) throw new Error(`OSS responded ${response.status}`);
    const json = (await response.json()) as unknown;

    if (isStudioData(json)) {
      const normalizedWorks = json.works.map(normalizeWork).filter((work): work is Work => Boolean(work));
      if (normalizedWorks.length === 0) throw new Error("OSS JSON contains no usable works.");

      return {
        ...fallbackData,
        ...json,
        works: normalizedWorks.sort((a, b) => a.order - b.order),
        tools: [...(json.tools || fallbackData.tools)].sort((a, b) => a.order - b.order),
        socials: [...(json.socials || fallbackData.socials)].sort((a, b) => a.order - b.order),
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
