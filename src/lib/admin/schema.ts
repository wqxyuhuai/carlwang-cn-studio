export type AdminCollectionKey =
  | "page-sections"
  | "works"
  | "work-types"
  | "tools"
  | "about-experience"
  | "about-skills"
  | "social-links"
  | "media-assets"
  | "contact-messages"
  | "site-settings";

export type AdminViewKey = "dashboard" | "integrations" | "security" | AdminCollectionKey;

export type AdminFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "url"
  | "email"
  | "readonly";

export type AdminValue = string | number | boolean | string[] | null;

export type AdminRecord = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  notionUrl?: string;
  [key: string]: AdminValue | undefined;
};

export type NotionFieldType = "title" | "rich_text" | "number" | "checkbox" | "select" | "url" | "email";

export type AdminField = {
  key: string;
  label: string;
  type: AdminFieldType;
  description?: string;
  options?: string[];
  required?: boolean;
  readOnly?: boolean;
  table?: boolean;
  multiline?: boolean;
  placeholder?: string;
  notion?: {
    name: string;
    type: NotionFieldType;
  };
};

export type AdminCollectionConfig = {
  key: AdminCollectionKey;
  label: string;
  navLabel: string;
  description: string;
  apiPath: string;
  databaseEnv: string[];
  titleField: string;
  allowCreate: boolean;
  allowDelete: boolean;
  deleteLabel: "Archive" | "Delete";
  readOnly?: boolean;
  fields: AdminField[];
  tableColumns: string[];
};

export type AdminNavItem = {
  key: AdminViewKey;
  label: string;
};

const statusOptions = ["Draft", "Ready", "Published", "Archived"];
const workCategoryOptions = ["Website", "Brand", "UI Product", "Motion", "3D Render", "Campaign", "Experiment"];
const pageOptions = ["Home", "Works", "Work Detail", "About", "Contact", "Footer"];
const groupOptions = ["General", "SEO", "Footer", "Integration", "Security", "Contact", "Portfolio", "Social"];

export const collectionConfigs: Record<AdminCollectionKey, AdminCollectionConfig> = {
  "page-sections": {
    key: "page-sections",
    label: "Page Content",
    navLabel: "Page Content",
    description: "Fixed page copy for Home, Works, Work Detail, About, Contact and Footer.",
    apiPath: "page-sections",
    databaseEnv: ["NOTION_PAGE_SECTIONS_DATABASE_ID"],
    titleField: "title",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["title", "page", "sectionKey", "visible", "order", "updatedAt"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, table: true, notion: { name: "Title", type: "title" } },
      { key: "page", label: "Page", type: "select", options: pageOptions, table: true, notion: { name: "Page", type: "select" } },
      { key: "sectionKey", label: "Section Key", type: "text", required: true, table: true, notion: { name: "Section Key", type: "rich_text" } },
      { key: "sectionName", label: "Section Name", type: "text", notion: { name: "Section Name", type: "rich_text" } },
      { key: "titleEn", label: "Title EN", type: "text", notion: { name: "Title EN", type: "rich_text" } },
      { key: "titleCn", label: "Title CN", type: "text", notion: { name: "Title CN", type: "rich_text" } },
      { key: "subtitleEn", label: "Subtitle EN", type: "text", notion: { name: "Subtitle EN", type: "rich_text" } },
      { key: "subtitleCn", label: "Subtitle CN", type: "text", notion: { name: "Subtitle CN", type: "rich_text" } },
      { key: "bodyEn", label: "Body EN", type: "textarea", notion: { name: "Body EN", type: "rich_text" } },
      { key: "bodyCn", label: "Body CN", type: "textarea", notion: { name: "Body CN", type: "rich_text" } },
      { key: "ctaLabelEn", label: "CTA Label EN", type: "text", notion: { name: "CTA Label EN", type: "rich_text" } },
      { key: "ctaLabelCn", label: "CTA Label CN", type: "text", notion: { name: "CTA Label CN", type: "rich_text" } },
      { key: "ctaUrl", label: "CTA URL", type: "url", notion: { name: "CTA URL", type: "url" } },
      { key: "mediaUrl", label: "Media URL", type: "url", notion: { name: "Media URL", type: "url" } },
      { key: "order", label: "Order", type: "number", table: true, notion: { name: "Order", type: "number" } },
      { key: "visible", label: "Visible", type: "boolean", table: true, notion: { name: "Visible", type: "checkbox" } },
      { key: "locked", label: "Locked", type: "boolean", readOnly: true, notion: { name: "Locked", type: "checkbox" } },
      { key: "updatedAt", label: "Updated At", type: "readonly", readOnly: true, table: true }
    ]
  },
  works: {
    key: "works",
    label: "Works",
    navLabel: "Works",
    description: "Portfolio work entries, cover media, publish state, sort order and detail metadata.",
    apiPath: "works",
    databaseEnv: ["NOTION_WORKS_DATABASE_ID", "NOTION_PROJECTS_DATA_SOURCE_ID"],
    titleField: "title",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["title", "status", "category", "year", "featured", "order", "updatedAt"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, table: true, notion: { name: "Title", type: "title" } },
      { key: "slug", label: "Slug", type: "text", required: true, notion: { name: "Slug", type: "rich_text" } },
      { key: "status", label: "Status", type: "select", options: statusOptions, required: true, table: true, notion: { name: "Status", type: "select" } },
      { key: "year", label: "Year", type: "number", required: true, table: true, notion: { name: "Year", type: "number" } },
      { key: "category", label: "Category", type: "select", options: workCategoryOptions, table: true, notion: { name: "Category", type: "select" } },
      { key: "featured", label: "Featured", type: "boolean", table: true, notion: { name: "Featured", type: "checkbox" } },
      { key: "order", label: "Order", type: "number", table: true, notion: { name: "Order", type: "number" } },
      { key: "cover", label: "Cover Image URL", type: "url", required: true, notion: { name: "Cover", type: "url" } },
      { key: "gallery", label: "Gallery URLs", type: "textarea", placeholder: "One URL per line", notion: { name: "Gallery Images", type: "rich_text" } },
      { key: "intro", label: "Short Intro", type: "textarea", notion: { name: "Intro", type: "rich_text" } },
      { key: "role", label: "Role", type: "text", notion: { name: "Role", type: "rich_text" } },
      { key: "tools", label: "Tools", type: "text", placeholder: "Figma, Photoshop", notion: { name: "Tools", type: "rich_text" } },
      { key: "externalUrl", label: "External URL", type: "url", notion: { name: "External URL", type: "url" } },
      { key: "notionUrl", label: "Notion Page", type: "readonly", readOnly: true },
      { key: "updatedAt", label: "Updated At", type: "readonly", readOnly: true, table: true }
    ]
  },
  "work-types": {
    key: "work-types",
    label: "Work Types",
    navLabel: "Work Types",
    description: "Project categories used by the home field section, Works filters and footer links.",
    apiPath: "work-types",
    databaseEnv: ["NOTION_WORK_TYPES_DATABASE_ID"],
    titleField: "titleEn",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["titleEn", "slug", "homeVisible", "filterVisible", "footerVisible", "order"],
    fields: [
      { key: "titleEn", label: "English Name", type: "text", required: true, table: true, notion: { name: "English Name", type: "title" } },
      { key: "titleCn", label: "Chinese Name", type: "text", notion: { name: "Chinese Name", type: "rich_text" } },
      { key: "slug", label: "Slug", type: "text", required: true, table: true, notion: { name: "Slug", type: "rich_text" } },
      { key: "description", label: "Description", type: "textarea", notion: { name: "Description", type: "rich_text" } },
      { key: "status", label: "Status", type: "select", options: statusOptions, notion: { name: "Status", type: "select" } },
      { key: "homeVisible", label: "Home Visible", type: "boolean", table: true, notion: { name: "Home Visible", type: "checkbox" } },
      { key: "filterVisible", label: "Filter Visible", type: "boolean", table: true, notion: { name: "Filter Visible", type: "checkbox" } },
      { key: "footerVisible", label: "Footer Visible", type: "boolean", table: true, notion: { name: "Footer Visible", type: "checkbox" } },
      { key: "order", label: "Order", type: "number", table: true, notion: { name: "Order", type: "number" } }
    ]
  },
  tools: {
    key: "tools",
    label: "Tools",
    navLabel: "Tools",
    description: "Design, motion, development and production tools shown across the site.",
    apiPath: "tools",
    databaseEnv: ["NOTION_TOOLS_DATABASE_ID", "NOTION_TOOLS_DATA_SOURCE_ID"],
    titleField: "name",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["name", "category", "active", "order", "updatedAt"],
    fields: [
      { key: "name", label: "Name", type: "text", required: true, table: true, notion: { name: "Name", type: "title" } },
      { key: "category", label: "Category", type: "text", table: true, notion: { name: "Category", type: "rich_text" } },
      { key: "icon", label: "Icon URL", type: "url", notion: { name: "Icon", type: "url" } },
      { key: "website", label: "Website", type: "url", notion: { name: "Website", type: "url" } },
      { key: "active", label: "Active", type: "boolean", table: true, notion: { name: "Active", type: "checkbox" } },
      { key: "order", label: "Order", type: "number", table: true, notion: { name: "Order", type: "number" } },
      { key: "updatedAt", label: "Updated At", type: "readonly", readOnly: true, table: true }
    ]
  },
  "about-experience": {
    key: "about-experience",
    label: "About Experience",
    navLabel: "About",
    description: "Experience rows used by the About page.",
    apiPath: "about-experience",
    databaseEnv: ["NOTION_ABOUT_EXPERIENCE_DATABASE_ID"],
    titleField: "role",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["role", "company", "period", "visible", "order"],
    fields: [
      { key: "role", label: "Role", type: "text", required: true, table: true, notion: { name: "Role", type: "title" } },
      { key: "company", label: "Company", type: "text", table: true, notion: { name: "Company", type: "rich_text" } },
      { key: "period", label: "Period", type: "text", table: true, notion: { name: "Period", type: "rich_text" } },
      { key: "descriptionEn", label: "Description EN", type: "textarea", notion: { name: "Description EN", type: "rich_text" } },
      { key: "descriptionCn", label: "Description CN", type: "textarea", notion: { name: "Description CN", type: "rich_text" } },
      { key: "imageUrl", label: "Image URL", type: "url", notion: { name: "Image URL", type: "url" } },
      { key: "visible", label: "Visible", type: "boolean", table: true, notion: { name: "Visible", type: "checkbox" } },
      { key: "order", label: "Order", type: "number", table: true, notion: { name: "Order", type: "number" } }
    ]
  },
  "about-skills": {
    key: "about-skills",
    label: "About Skills",
    navLabel: "Skills",
    description: "Skill groups and skill rows for the About page.",
    apiPath: "about-skills",
    databaseEnv: ["NOTION_ABOUT_SKILLS_DATABASE_ID"],
    titleField: "nameEn",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["group", "nameEn", "nameCn", "visible", "order"],
    fields: [
      { key: "nameEn", label: "Name EN", type: "text", required: true, table: true, notion: { name: "Name EN", type: "title" } },
      { key: "nameCn", label: "Name CN", type: "text", table: true, notion: { name: "Name CN", type: "rich_text" } },
      { key: "group", label: "Group", type: "text", table: true, notion: { name: "Group", type: "rich_text" } },
      { key: "level", label: "Level", type: "text", notion: { name: "Level", type: "rich_text" } },
      { key: "visible", label: "Visible", type: "boolean", table: true, notion: { name: "Visible", type: "checkbox" } },
      { key: "order", label: "Order", type: "number", table: true, notion: { name: "Order", type: "number" } }
    ]
  },
  "social-links": {
    key: "social-links",
    label: "Social Links",
    navLabel: "Social Links",
    description: "Contact and portfolio links used by About, Contact and Footer.",
    apiPath: "social-links",
    databaseEnv: ["NOTION_SOCIAL_LINKS_DATABASE_ID", "NOTION_SOCIAL_LINKS_DATA_SOURCE_ID"],
    titleField: "platform",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["platform", "label", "group", "active", "order"],
    fields: [
      { key: "platform", label: "Platform", type: "text", required: true, table: true, notion: { name: "Platform", type: "title" } },
      { key: "label", label: "Display Label", type: "text", table: true, notion: { name: "Display Label", type: "rich_text" } },
      { key: "url", label: "URL", type: "url", required: true, notion: { name: "URL", type: "url" } },
      { key: "handle", label: "Handle", type: "text", notion: { name: "Handle", type: "rich_text" } },
      { key: "group", label: "Group", type: "select", options: groupOptions, table: true, notion: { name: "Group", type: "select" } },
      { key: "active", label: "Active", type: "boolean", table: true, notion: { name: "Active", type: "checkbox" } },
      { key: "footerVisible", label: "Footer Visible", type: "boolean", notion: { name: "Footer Visible", type: "checkbox" } },
      { key: "contactVisible", label: "Contact Visible", type: "boolean", notion: { name: "Contact Visible", type: "checkbox" } },
      { key: "order", label: "Order", type: "number", table: true, notion: { name: "Order", type: "number" } }
    ]
  },
  "media-assets": {
    key: "media-assets",
    label: "Media Library",
    navLabel: "Media",
    description: "OSS-backed media records for works, about, tools, social icons and general assets.",
    apiPath: "media-assets",
    databaseEnv: ["NOTION_MEDIA_ASSETS_DATABASE_ID"],
    titleField: "title",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Delete",
    tableColumns: ["title", "type", "usage", "url", "updatedAt"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, table: true, notion: { name: "Title", type: "title" } },
      { key: "url", label: "URL", type: "url", required: true, table: true, notion: { name: "URL", type: "url" } },
      { key: "objectKey", label: "OSS Object Key", type: "readonly", readOnly: true, notion: { name: "Object Key", type: "rich_text" } },
      { key: "type", label: "Type", type: "select", options: ["image", "video", "icon", "file"], table: true, notion: { name: "Type", type: "select" } },
      { key: "usage", label: "Usage", type: "select", options: ["works", "about", "tools", "social", "general"], table: true, notion: { name: "Usage", type: "select" } },
      { key: "alt", label: "Alt Text", type: "text", notion: { name: "Alt Text", type: "rich_text" } },
      { key: "size", label: "Size", type: "readonly", readOnly: true, notion: { name: "Size", type: "rich_text" } },
      { key: "updatedAt", label: "Updated At", type: "readonly", readOnly: true, table: true }
    ]
  },
  "contact-messages": {
    key: "contact-messages",
    label: "Contact Messages",
    navLabel: "Messages",
    description: "Front-end contact form submissions. Raw name, email and message stay read-only.",
    apiPath: "contact-messages",
    databaseEnv: ["NOTION_CONTACT_MESSAGES_DATABASE_ID", "NOTION_CONTACT_MESSAGES_DATA_SOURCE_ID"],
    titleField: "name",
    allowCreate: false,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["name", "email", "projectType", "status", "createdAt"],
    fields: [
      { key: "name", label: "Name", type: "readonly", readOnly: true, table: true, notion: { name: "Name", type: "title" } },
      { key: "email", label: "Email", type: "readonly", readOnly: true, table: true, notion: { name: "Email", type: "email" } },
      { key: "company", label: "Company", type: "readonly", readOnly: true, notion: { name: "Company", type: "rich_text" } },
      { key: "projectType", label: "Project Type", type: "readonly", readOnly: true, table: true, notion: { name: "Project Type", type: "rich_text" } },
      { key: "message", label: "Message", type: "textarea", readOnly: true, notion: { name: "Message", type: "rich_text" } },
      { key: "status", label: "Status", type: "select", options: ["New", "Read", "Replied", "Archived"], table: true, notion: { name: "Status", type: "select" } },
      { key: "note", label: "Internal Note", type: "textarea", notion: { name: "Note", type: "rich_text" } },
      { key: "createdAt", label: "Created At", type: "readonly", readOnly: true, table: true }
    ]
  },
  "site-settings": {
    key: "site-settings",
    label: "Site Settings",
    navLabel: "Settings",
    description: "Public site title, SEO, footer, logo and public integration settings.",
    apiPath: "site-settings",
    databaseEnv: ["NOTION_SITE_SETTINGS_DATABASE_ID", "NOTION_SITE_SETTINGS_DATA_SOURCE_ID"],
    titleField: "name",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["name", "group", "type", "public", "updatedAt"],
    fields: [
      { key: "name", label: "Name", type: "text", required: true, table: true, notion: { name: "Name", type: "title" } },
      { key: "group", label: "Group", type: "select", options: groupOptions, table: true, notion: { name: "Group", type: "select" } },
      { key: "type", label: "Type", type: "select", options: ["Text", "URL", "Image", "Boolean", "JSON", "EnvRef"], table: true, notion: { name: "Type", type: "select" } },
      { key: "value", label: "Value", type: "textarea", notion: { name: "Value", type: "rich_text" } },
      { key: "public", label: "Public", type: "boolean", table: true, notion: { name: "Public", type: "checkbox" } },
      { key: "description", label: "Description", type: "textarea", notion: { name: "Description", type: "rich_text" } },
      { key: "order", label: "Order", type: "number", notion: { name: "Order", type: "number" } },
      { key: "updatedAt", label: "Updated At", type: "readonly", readOnly: true, table: true }
    ]
  }
};

export const adminNavigation: AdminNavItem[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "page-sections", label: "Page Content" },
  { key: "works", label: "Works" },
  { key: "work-types", label: "Work Types" },
  { key: "tools", label: "Tools" },
  { key: "about-experience", label: "About" },
  { key: "social-links", label: "Social Links" },
  { key: "media-assets", label: "Media Library" },
  { key: "contact-messages", label: "Contact Messages" },
  { key: "integrations", label: "Integrations" },
  { key: "site-settings", label: "Site Settings" },
  { key: "security", label: "Security" }
];

export const collectionConfigList = Object.values(collectionConfigs);

export function getCollectionConfig(key: string): AdminCollectionConfig | undefined {
  return collectionConfigs[key as AdminCollectionKey];
}

export function isCollectionKey(key: string): key is AdminCollectionKey {
  return key in collectionConfigs;
}
