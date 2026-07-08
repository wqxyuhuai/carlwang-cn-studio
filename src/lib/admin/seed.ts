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

const requiredPageSections = [
  ["home-hero", "Home", "home_hero", "Home hero", "Designing clarity for complex systems.", 1],
  ["home-featured-works", "Home", "home_featured_works", "Featured works", "Featured Works", 2],
  ["home-project-types", "Home", "home_project_types", "Project types", "Project Types", 3],
  ["home-tools", "Home", "home_tools", "Tools", "Tools", 4],
  ["home-intro-contact", "Home", "home_intro_contact", "Intro contact", "Start a project", 5],
  ["works-hero", "Works", "works_hero", "Works hero", "Works", 10],
  ["works-filter-intro", "Works", "works_filter_intro", "Works filter intro", "Browse by type", 11],
  ["work-detail-template", "Work Detail", "work_detail_template", "Work detail template", "Project detail", 20],
  ["about-intro", "About", "about_intro", "About intro", "About", 30],
  ["about-portrait", "About", "about_portrait", "About portrait", "Portrait", 31],
  ["about-design-direction", "About", "about_design_direction", "Design direction", "Design Direction", 32],
  ["about-skills", "About", "about_skills", "About skills", "Skills", 33],
  ["about-experience", "About", "about_experience", "About experience", "Experience", 34],
  ["about-contact", "About", "about_contact", "About contact", "Get in touch", 35],
  ["footer-main", "Footer", "footer_main", "Footer main", "Carl Wang Studio", 100],
  ["footer-navigation", "Footer", "footer_navigation", "Footer navigation", "Navigation", 101],
  ["footer-contact", "Footer", "footer_contact", "Footer contact", "Contact", 102]
] as const;

const pageSections: AdminRecord[] = requiredPageSections.map(([id, page, sectionKey, title, titleEn, order]) => ({
  id,
  title,
  page,
  sectionKey,
  titleEn,
  titleCn: "",
  subtitleEn: "",
  subtitleCn: "",
  bodyEn: "",
  bodyCn: "",
  ctaLabelEn: "",
  ctaLabelCn: "",
  ctaUrl: "",
  mediaUrl: "",
  order,
  visible: true,
  locked: true,
  createdAt: now,
  updatedAt: now
}));

const works: AdminRecord[] = fallbackData.works.map((work) => ({
  id: work.id,
  title: work.title,
  slug: work.slug,
  status: work.status,
  year: work.year,
  publishedAt: work.publishedAt,
  viewCount: work.viewCount,
  likeCount: work.likeCount,
  primaryType: work.category,
  tags: "",
  featured: work.featured,
  featuredOrder: work.featured ? work.order : 0,
  order: work.order,
  coverImage: mediaUrl(work.cover),
  galleryImages: work.gallery.map((item) => item.src).join("\n"),
  shortIntroEn: work.intro,
  shortIntroCn: "",
  overviewEn: "",
  overviewCn: "",
  roleEn: work.role,
  roleCn: "",
  clientBrand: "",
  tools: work.tools.join("\n"),
  externalUrl: "",
  createdAt: now,
  updatedAt: now
}));

const workTypes: AdminRecord[] = [
  ["Brand Design", "品牌设计", "brand-design", "Brand"],
  ["Web Design", "网站设计", "web-design", "Web"],
  ["App & Platform Design", "App 与平台设计", "app-platform-design", "App"],
  ["Product Design", "产品设计", "product-design", "Product"],
  ["Exhibition Design", "展会设计", "exhibition-design", "Exhibition"],
  ["Motion & Video", "视频与动效", "motion-video", "Motion"],
  ["AI & Personal Projects", "AI 与个人项目", "ai-personal-projects", "AI"]
].map(([nameEn, nameCn, slug, shortLabel], index) => ({
  id: slug,
  nameEn,
  nameCn,
  slug,
  shortLabel,
  descriptionEn: "",
  descriptionCn: "",
  iconUrl: "",
  status: "Published",
  homeVisible: true,
  filterVisible: true,
  order: index + 1,
  createdAt: now,
  updatedAt: now
}));

function normalizeToolCategory(category: string) {
  if (["Design", "Motion", "3D", "Development", "AI", "Workflow"].includes(category)) return category;
  return "Design";
}

const tools: AdminRecord[] = fallbackData.tools.map((tool) => ({
  id: tool.name.toLowerCase().replaceAll(" ", "-"),
  name: tool.name,
  category: normalizeToolCategory(tool.category),
  iconUrl: "",
  descriptionEn: "",
  descriptionCn: "",
  homeVisible: tool.active,
  status: tool.active ? "Published" : "Archived",
  order: tool.order,
  createdAt: now,
  updatedAt: now
}));

const aboutExperience: AdminRecord[] = [
  {
    id: "designer-product-systems",
    title: "Product / Visual Designer",
    organization: "Independent Studio",
    location: "Shanghai / Remote",
    startDate: "2024-01-01",
    endDate: "",
    isCurrent: true,
    descriptionEn: "Designing identity systems, web interfaces and portfolio storytelling.",
    descriptionCn: "负责品牌系统、网站界面与作品叙事设计。",
    tags: "Brand, Web, Product",
    visible: true,
    order: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "motion-content",
    title: "Motion & Content",
    organization: "Selected Projects",
    location: "",
    startDate: "2022-01-01",
    endDate: "2024-12-31",
    isCurrent: false,
    descriptionEn: "Motion-led campaign visuals, launch pages and social content systems.",
    descriptionCn: "动效驱动的活动视觉、发布页与社媒内容系统。",
    tags: "Motion, Campaign",
    visible: true,
    order: 2,
    createdAt: now,
    updatedAt: now
  }
];

const aboutSkills: AdminRecord[] = [
  {
    id: "design-systems",
    groupNameEn: "Design Systems",
    groupNameCn: "设计系统",
    items: "Visual System\nInterface Direction\nBrand Guidelines",
    descriptionEn: "",
    descriptionCn: "",
    visible: true,
    order: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "motion-content",
    groupNameEn: "Motion & Content",
    groupNameCn: "动效与内容",
    items: "Motion Direction\nCampaign Visuals\nSocial Content",
    descriptionEn: "",
    descriptionCn: "",
    visible: true,
    order: 2,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "digital-production",
    groupNameEn: "Digital Production",
    groupNameCn: "数字制作",
    items: "Web Design\nPrototype\nFrontend Collaboration",
    descriptionEn: "",
    descriptionCn: "",
    visible: true,
    order: 3,
    createdAt: now,
    updatedAt: now
  }
];

const socialLinks: AdminRecord[] = [
  {
    id: "contact-form",
    platform: "Contact Form",
    labelEn: "Contact Form",
    labelCn: "联系表单",
    url: "/about#contact",
    type: "Form",
    iconUrl: "",
    footerVisible: true,
    contactVisible: true,
    status: "Published",
    order: 0,
    createdAt: now,
    updatedAt: now
  },
  ...fallbackData.socials.map((social) => ({
    id: social.platform.toLowerCase().replaceAll(" ", "-"),
    platform: social.platform,
    labelEn: social.label,
    labelCn: social.platform === "Xiaohongshu" ? "小红书" : social.label,
    url: social.url,
    type: social.group,
    iconUrl: "",
    footerVisible: social.group === "Footer" || social.group === "Portfolio" || social.group === "Contact",
    contactVisible: social.group === "Contact" || social.group === "Portfolio" || social.group === "Social",
    status: social.active ? "Published" : "Archived",
    order: social.order,
    createdAt: now,
    updatedAt: now
  }))
];

const siteSettings: AdminRecord[] = [
  { id: "site-title", name: "site_title", group: "General", type: "Text", value: fallbackData.settings.seoTitle, public: true, locked: true, description: "Website title", order: 1, createdAt: now, updatedAt: now },
  { id: "site-description", name: "site_description", group: "SEO", type: "Text", value: fallbackData.settings.seoDescription, public: true, locked: true, description: "Website description", order: 2, createdAt: now, updatedAt: now },
  { id: "default-language", name: "default_language", group: "General", type: "Text", value: "en", public: true, locked: true, description: "Default language", order: 3, createdAt: now, updatedAt: now },
  { id: "logo-url", name: "logo_url", group: "General", type: "URL", value: "", public: true, locked: true, description: "Logo URL", order: 4, createdAt: now, updatedAt: now },
  { id: "favicon-url", name: "favicon_url", group: "General", type: "URL", value: "/icon.svg", public: true, locked: true, description: "Favicon URL", order: 5, createdAt: now, updatedAt: now },
  { id: "footer-copyright", name: "footer_copyright", group: "Footer", type: "Text", value: "© Carl Wang. All rights reserved.", public: true, locked: true, description: "Footer copyright text", order: 6, createdAt: now, updatedAt: now },
  { id: "contact-email", name: "contact_email", group: "Contact", type: "Text", value: "wqxyuhuai@163.com", public: true, locked: true, description: "Public contact email", order: 7, createdAt: now, updatedAt: now },
  { id: "oss-public-base-url", name: "oss_public_base_url", group: "Integration", type: "URL", value: process.env.ALIYUN_OSS_PUBLIC_BASE_URL || "", public: true, locked: true, description: "Aliyun OSS public base URL only, never credentials", order: 8, createdAt: now, updatedAt: now },
  { id: "notion-workspace-name", name: "notion_workspace_name", group: "Integration", type: "Text", value: process.env.NOTION_WORKSPACE_NAME || "", public: false, locked: true, description: "Read-only Notion workspace display name", order: 9, createdAt: now, updatedAt: now }
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
  "contact-messages": []
};
