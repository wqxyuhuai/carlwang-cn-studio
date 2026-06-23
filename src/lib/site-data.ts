import type { StudioData, Work } from "./types";

export const CONTENT_URL =
  process.env.NEXT_PUBLIC_CONTENT_URL ||
  "https://carlwang-cn.oss-cn-shanghai.aliyuncs.com/uploads/site-content.json";

const image = (name: string, alt: string, caption?: string) => ({
  type: "image" as const,
  src: `/reference/${name}`,
  alt,
  caption,
  width: 1600,
  height: 1100,
});

export const fallbackWorks: Work[] = [
  {
    id: "brand-motion-system",
    slug: "brand-motion-system",
    title: "Brand Motion System",
    year: "2026",
    category: "Motion",
    role: "Visual direction, motion system, web prototype",
    tools: ["Figma", "After Effects", "Next.js", "AI workflow"],
    intro:
      "A motion-led visual system exploring how brand rules, interface rhythm, and campaign assets can share one language.",
    coverImage: image("A1 1.webp", "Layered hero reference with oversized type and staggered visual panels"),
    gallery: [
      image("A1 1.webp", "Black hero canvas with large typography"),
      image("A1 4.webp", "Editorial work section with image and text rhythm"),
      image("C1 1.webp", "Visual study with high contrast product imagery"),
    ],
    content: [
      {
        type: "heading_2",
        text: [{ text: "System first, page second" }],
      },
      {
        type: "paragraph",
        text: [
          {
            text: "The project starts from reusable visual and motion rules, then turns those rules into pages, launch assets, and reusable case-study templates.",
          },
        ],
      },
      {
        type: "column_list",
        columns: [
          [
            { type: "image", media: image("C1 2.webp", "Detail view of visual composition", "Composition reference") },
          ],
          [
            {
              type: "quote",
              text: [{ text: "A clear system should make the strongest screen easier to repeat." }],
            },
            {
              type: "paragraph",
              text: [
                {
                  text: "The renderer keeps columns, captions, links, and styled text intact while falling back gracefully for unsupported Notion blocks.",
                },
              ],
            },
          ],
        ],
      },
    ],
    featured: true,
    status: "Published",
    order: 1,
    seoTitle: "Brand Motion System",
    seoDescription: "A motion-led visual system case study by Carl Wang Studio.",
  },
  {
    id: "studio-web-experience",
    slug: "studio-web-experience",
    title: "Studio Web Experience",
    year: "2026",
    category: "Website",
    role: "Experience design, frontend, content model",
    tools: ["Next.js", "TypeScript", "Notion", "Aliyun OSS"],
    intro:
      "A studio website framework with an editorial front end, Notion-sourced works, OSS-hosted media, and a protected admin console.",
    coverImage: image("B1 1.webp", "Works page reference with oversized page title and right aligned grid"),
    gallery: [
      image("B1 1.webp", "Large works page layout reference"),
      image("A2 1.webp", "About page reference with large type and structured content"),
      image("C1 3.webp", "Supporting gallery image"),
    ],
    content: [
      { type: "heading_2", text: [{ text: "Editorial browsing, structured publishing" }] },
      {
        type: "paragraph",
        text: [
          { text: "The front end reads static JSON from OSS with local fallback data, so content updates do not require a code deploy." },
        ],
      },
      {
        type: "bookmark",
        title: "Public content JSON",
        url: CONTENT_URL,
        description: "Temporary read endpoint until the formal preview and publish paths are configured.",
      },
    ],
    featured: true,
    status: "Published",
    order: 2,
  },
  {
    id: "interface-direction-kit",
    slug: "interface-direction-kit",
    title: "Interface Direction Kit",
    year: "2025",
    category: "UI Product",
    role: "Interface direction, component rules",
    tools: ["Figma", "React", "Design tokens"],
    intro:
      "A product interface direction kit that aligns typography, component density, empty states, and admin workflows.",
    coverImage: image("C1 4.webp", "Interface visual study"),
    gallery: [image("C1 4.webp", "Interface visual study"), image("C1 5.webp", "Detail supporting image")],
    content: [
      { type: "heading_2", text: [{ text: "Admin surfaces use the same language" }] },
      {
        type: "paragraph",
        text: [{ text: "The admin is quieter than the public site, but it still uses the same color, spacing, state, and focus rules." }],
      },
      { type: "unsupported", label: "synced_database" },
    ],
    featured: true,
    status: "Published",
    order: 3,
  },
  {
    id: "campaign-image-system",
    slug: "campaign-image-system",
    title: "Campaign Image System",
    year: "2025",
    category: "Campaign",
    role: "Art direction, asset system",
    tools: ["Photoshop", "Figma", "Runway"],
    intro: "A flexible image system for campaign pages, thumbnails, and social cuts.",
    coverImage: image("C1 1.webp", "Campaign image system cover"),
    gallery: [image("C1 1.webp", "Campaign image system cover")],
    content: [{ type: "paragraph", text: [{ text: "A compact case entry used to validate empty and short detail content." }] }],
    featured: false,
    status: "Published",
    order: 4,
  },
  {
    id: "visual-identity-refresh",
    slug: "visual-identity-refresh",
    title: "Visual Identity Refresh",
    year: "2024",
    category: "Brand",
    role: "Brand system, web application",
    tools: ["Figma", "Illustrator", "Next.js"],
    intro: "A restrained identity refresh built around motion-ready rules and clear digital usage.",
    coverImage: image("C1 2.webp", "Visual identity refresh cover"),
    gallery: [image("C1 2.webp", "Visual identity refresh cover")],
    content: [{ type: "paragraph", text: [{ text: "Brand assets, interface examples, and launch modules share one tokenized structure." }] }],
    featured: false,
    status: "Published",
    order: 5,
  },
  {
    id: "render-experiments",
    slug: "render-experiments",
    title: "Render Experiments",
    year: "2024",
    category: "3D Render",
    role: "Concept, render direction",
    tools: ["Blender", "Figma"],
    intro: "A compact set of render experiments for visual storytelling and landing page assets.",
    coverImage: image("C1 5.webp", "Render experiments cover"),
    gallery: [image("C1 5.webp", "Render experiments cover")],
    content: [{ type: "paragraph", text: [{ text: "The entry checks that smaller experimental projects still render as complete case pages." }] }],
    featured: false,
    status: "Draft",
    order: 6,
  },
];

export const fallbackData: StudioData = {
  settings: {
    defaultTheme: "system",
    accentColor: "#B7D075",
    homeHeroTitle: "CARL WANG STUDIO",
    homeHeroDescription:
      "Designing visual systems, digital products, and web experiences with clarity and motion.",
    seoTitle: "Carl Wang Studio",
    seoDescription:
      "Personal studio portfolio for brand visuals, product interfaces, web experiences, and motion-driven content.",
    socialLinks: [
      { label: "Email", href: "mailto:hello@carlwang.cn" },
      { label: "Behance", href: "https://www.behance.net/" },
      { label: "Instagram", href: "https://www.instagram.com/" },
    ],
  },
  works: fallbackWorks,
  about: {
    name: "Carl Wang",
    title: "Designer across visual systems, web experiences, and motion content",
    intro:
      "I work across brand visuals, product interfaces, web experiences, and motion-driven content.",
    bio:
      "I focus on building clear visual systems and practical digital experiences that can move from concept to execution. The work sits between strong visual direction, usable interfaces, and maintainable content workflows.",
    email: "hello@carlwang.cn",
    skills: [
      { name: "Brand & Visual", items: ["Identity systems", "Art direction", "Campaign language"] },
      { name: "Web & Interaction", items: ["Responsive websites", "Motion systems", "Frontend prototypes"] },
      { name: "Product & Experience", items: ["Interface systems", "User flows", "Design QA"] },
      { name: "Motion & Content", items: ["Launch videos", "Micro-interactions", "Asset systems"] },
      { name: "Design Workflow & AI Tools", items: ["Notion content ops", "AI-assisted iteration", "Handoff systems"] },
    ],
    experience: [
      {
        company: "Independent Studio",
        role: "Designer / Frontend collaborator",
        period: "2024 to Now",
        summary: "Building visual systems, portfolio sites, and content workflows for digital brands.",
      },
      {
        company: "Brand and Product Teams",
        role: "Visual and UI designer",
        period: "2021 to 2024",
        summary: "Worked across campaign visuals, product interfaces, and web launch surfaces.",
      },
      {
        company: "Content Experiments",
        role: "Motion and AI workflow exploration",
        period: "2020 to Now",
        summary: "Exploring how motion, generated assets, and design systems can support production.",
      },
    ],
    socialLinks: [
      { label: "Email", href: "mailto:hello@carlwang.cn" },
      { label: "Behance", href: "https://www.behance.net/" },
      { label: "Instagram", href: "https://www.instagram.com/" },
    ],
  },
  sync: {
    source: "fallback",
    error: "Using local fallback data until OSS content JSON is available.",
  },
};

function isStudioData(value: unknown): value is StudioData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StudioData>;
  return Array.isArray(candidate.works) && Boolean(candidate.about) && Boolean(candidate.settings);
}

export async function getStudioData(): Promise<StudioData> {
  try {
    const response = await fetch(CONTENT_URL, {
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      throw new Error(`OSS responded ${response.status}`);
    }

    const json = (await response.json()) as unknown;

    if (isStudioData(json)) {
      return {
        ...json,
        works: [...json.works].sort((a, b) => a.order - b.order),
        sync: { source: "oss", lastSyncedAt: new Date().toISOString() },
      };
    }
  } catch (error) {
    return {
      ...fallbackData,
      sync: {
        source: "fallback",
        error: error instanceof Error ? error.message : "Unknown OSS read error",
      },
    };
  }

  return fallbackData;
}

export async function getPublishedWorks() {
  const data = await getStudioData();
  return data.works.filter((work) => work.status === "Published").sort((a, b) => a.order - b.order);
}

export async function getWorkBySlug(slug: string) {
  const works = await getPublishedWorks();
  return works.find((work) => work.slug === slug);
}
