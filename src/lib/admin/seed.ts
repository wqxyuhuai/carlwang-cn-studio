import { fallbackData } from "@/lib/site-data";
import type { AdminCollectionKey, AdminRecord } from "./schema";

export type AdminStoreData = Record<AdminCollectionKey, AdminRecord[]>;

const now = new Date().toISOString();

function mediaUrl(value: unknown): string {
  if (value && typeof value === "object" && "src" in value && typeof value.src === "string") {
    return value.src;
  }

  return "";
}

const pageSections: AdminRecord[] = [
  {
    id: "home-hero",
    title: "Home hero",
    page: "Home",
    sectionKey: "home_hero",
    sectionName: "Hero",
    titleEn: fallbackData.settings.homeHeroTitle,
    subtitleEn: fallbackData.settings.homeHeroDescription,
    bodyEn: "Opening statement for the home page.",
    order: 1,
    visible: true,
    locked: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "home-featured-works",
    title: "Featured works",
    page: "Home",
    sectionKey: "home_featured_works",
    sectionName: "Featured Works",
    titleEn: "Featured Works",
    bodyEn: "Selected projects from the studio archive.",
    order: 2,
    visible: true,
    locked: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "about-intro",
    title: "About intro",
    page: "About",
    sectionKey: "about_intro",
    sectionName: "Intro",
    titleEn: "About",
    bodyEn: "A designer working across visual, digital and spatial systems.",
    order: 10,
    visible: true,
    locked: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "footer-main",
    title: "Footer main",
    page: "Footer",
    sectionKey: "footer_main",
    sectionName: "Footer",
    bodyEn: "Carl Wang Studio. All rights reserved.",
    order: 100,
    visible: true,
    locked: true,
    createdAt: now,
    updatedAt: now
  }
];

const works: AdminRecord[] = fallbackData.works.map((work) => ({
  id: work.id,
  title: work.title,
  slug: work.slug,
  status: work.status,
  year: work.year,
  category: work.category,
  featured: work.featured,
  order: work.order,
  cover: mediaUrl(work.cover),
  gallery: work.gallery.map((item) => item.src).join("\n"),
  intro: work.intro,
  role: work.role,
  tools: work.tools.join(", "),
  externalUrl: "",
  createdAt: now,
  updatedAt: now
}));

const workTypes: AdminRecord[] = [
  ["Brand Design", "品牌设计", "brand-design"],
  ["Web Design", "网站设计", "web-design"],
  ["App & Platform Design", "App 与平台设计", "app-platform-design"],
  ["Product Design", "产品设计", "product-design"],
  ["Exhibition Design", "展览设计", "exhibition-design"],
  ["Motion & Video", "动效与视频", "motion-video"],
  ["AI & Personal Projects", "AI 与个人项目", "ai-personal-projects"]
].map(([titleEn, titleCn, slug], index) => ({
  id: slug,
  titleEn,
  titleCn,
  slug,
  description: "",
  status: "Published",
  homeVisible: true,
  filterVisible: true,
  footerVisible: true,
  order: index + 1,
  createdAt: now,
  updatedAt: now
}));

const tools: AdminRecord[] = fallbackData.tools.map((tool) => ({
  id: tool.name.toLowerCase().replaceAll(" ", "-"),
  name: tool.name,
  category: tool.category,
  icon: "",
  website: "",
  active: tool.active,
  order: tool.order,
  createdAt: now,
  updatedAt: now
}));

const aboutExperience: AdminRecord[] = [
  {
    id: "designer-product-systems",
    role: "Product / Visual Designer",
    company: "Independent Studio",
    period: "2024 - Now",
    descriptionEn: "Designing identity systems, web interfaces and portfolio storytelling.",
    descriptionCn: "负责品牌系统、网站界面与作品叙事设计。",
    imageUrl: "/figma/about-experience-thumb.png",
    visible: true,
    order: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "motion-content",
    role: "Motion & Content",
    company: "Selected Projects",
    period: "2022 - 2024",
    descriptionEn: "Motion-led campaign visuals, launch pages and social content systems.",
    descriptionCn: "动效驱动的活动视觉、发布页与社媒内容系统。",
    imageUrl: "/figma/about-direction.png",
    visible: true,
    order: 2,
    createdAt: now,
    updatedAt: now
  }
];

const aboutSkills: AdminRecord[] = [
  { id: "visual-system", group: "Design", nameEn: "Visual System", nameCn: "视觉系统", level: "Advanced", visible: true, order: 1, createdAt: now, updatedAt: now },
  { id: "interface-direction", group: "Design", nameEn: "Interface Direction", nameCn: "界面方向", level: "Advanced", visible: true, order: 2, createdAt: now, updatedAt: now },
  { id: "motion-content", group: "Motion", nameEn: "Motion & Content", nameCn: "动效与内容", level: "Working", visible: true, order: 3, createdAt: now, updatedAt: now }
];

const socialLinks: AdminRecord[] = fallbackData.socials.map((social) => ({
  id: social.platform.toLowerCase().replaceAll(" ", "-"),
  platform: social.platform,
  label: social.label,
  url: social.url,
  handle: social.handle || "",
  group: social.group,
  active: social.active,
  footerVisible: social.group === "Footer" || social.group === "Portfolio" || social.group === "Contact",
  contactVisible: social.group === "Contact" || social.group === "Portfolio" || social.group === "Social",
  order: social.order,
  createdAt: now,
  updatedAt: now
}));

const siteSettings: AdminRecord[] = [
  { id: "site-title", name: "site_title", group: "General", type: "Text", value: fallbackData.settings.seoTitle, public: true, description: "Website title", order: 1, createdAt: now, updatedAt: now },
  { id: "site-description", name: "site_description", group: "SEO", type: "Text", value: fallbackData.settings.seoDescription, public: true, description: "Website SEO description", order: 2, createdAt: now, updatedAt: now },
  { id: "content-url", name: "content_url", group: "Integration", type: "URL", value: fallbackData.settings.contentUrl, public: true, description: "Public OSS JSON source", order: 3, createdAt: now, updatedAt: now },
  { id: "footer-copyright", name: "footer_copyright", group: "Footer", type: "Text", value: "© Carl Wang. All rights reserved.", public: true, description: "Footer copyright text", order: 4, createdAt: now, updatedAt: now }
];

export const adminSeedData: AdminStoreData = {
  "page-sections": pageSections,
  works,
  "work-types": workTypes,
  tools,
  "about-experience": aboutExperience,
  "about-skills": aboutSkills,
  "social-links": socialLinks,
  "media-assets": [],
  "contact-messages": [],
  "site-settings": siteSettings
};
