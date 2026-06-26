export type AdminCollectionKey =
  | "page-sections"
  | "works"
  | "work-types"
  | "tools"
  | "about-experience"
  | "about-skills"
  | "social-links"
  | "media-assets"
  | "contact-messages";

export type AdminViewKey = "dashboard" | "integrations" | "security" | AdminCollectionKey;

export type AdminFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "url"
  | "email"
  | "date"
  | "readonly";

export type AdminValue = string | number | boolean | string[] | null;

export type AdminRecord = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  notionUrl?: string;
  [key: string]: AdminValue | undefined;
};

export type NotionFieldType =
  | "title"
  | "text"
  | "rich_text"
  | "number"
  | "checkbox"
  | "select"
  | "status"
  | "multi_select"
  | "url"
  | "file"
  | "files"
  | "email"
  | "date"
  | "relation"
  | "created_time"
  | "last_edited_time";

export type NotionPropertyMapping = {
  name: string;
  type: NotionFieldType;
};

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
  notion?: NotionPropertyMapping & {
    aliases?: NotionPropertyMapping[];
  };
};

export type AdminCollectionConfig = {
  key: AdminCollectionKey;
  label: string;
  navLabel: string;
  description: string;
  apiPath: string;
  databaseEnv: string[];
  notionTableName: string;
  legacyTableNames?: string[];
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

const workStatusOptions = ["Draft", "Published", "Archived"];
const syncStatusOptions = ["编辑中", "待同步", "待更新", "已同步"];
const pageOptions = ["Home", "Works", "Work Detail", "About", "Contact", "Footer"];
const toolCategoryOptions = ["Design", "Motion", "3D", "Development", "AI", "Font", "Workflow"];
const socialTypeOptions = ["Social", "Contact", "Portfolio", "Footer", "Form"];
const clickActionOptions = ["复制", "新窗口打开", "直接发送邮件"];
export const mediaUsageOptions = ["Work Cover", "Gallery", "Portrait", "Tool Icon", "Social Icon", "General"];
export const mediaTypeOptions = ["Image", "Video", "Icon", "Document"];

export const collectionConfigs: Record<AdminCollectionKey, AdminCollectionConfig> = {
  "page-sections": {
    key: "page-sections",
    label: "Page Content",
    navLabel: "Page Content",
    description: "Local fallback fixed page copy for Home, Works, Work Detail, About, Contact and Footer.",
    apiPath: "page-sections",
    databaseEnv: [],
    notionTableName: "Studio Page Sections",
    titleField: "title",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["title", "page", "sectionKey", "visible", "locked", "order", "updatedAt"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, table: true, notion: { name: "Title", type: "title" } },
      { key: "page", label: "Page", type: "select", options: pageOptions, required: true, table: true, notion: { name: "Page", type: "select" } },
      { key: "sectionKey", label: "Section Key", type: "text", required: true, table: true, notion: { name: "Section Key", type: "rich_text" } },
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
      { key: "locked", label: "Locked", type: "boolean", readOnly: true, table: true, notion: { name: "Locked", type: "checkbox" } },
      { key: "updatedAt", label: "Updated At", type: "readonly", readOnly: true, table: true, notion: { name: "Updated At", type: "last_edited_time" } }
    ]
  },
  works: {
    key: "works",
    label: "Works",
    navLabel: "Works",
    description: "Studio Projects source for Works list, Home featured works and detail pages.",
    apiPath: "works",
    databaseEnv: ["NOTION_WORKS_DATABASE_ID", "NOTION_STUDIO_PROJECTS_DATABASE_ID", "NOTION_PROJECTS_DATA_SOURCE_ID"],
    notionTableName: "Studio Projects",
    titleField: "title",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["title", "status", "primaryType", "publishedAt", "featured", "tools", "updatedAt"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, table: true, notion: { name: "Title", type: "title" } },
      { key: "syncStatus", label: "同步状态", type: "select", options: syncStatusOptions, table: true, notion: { name: "同步状态", type: "select" } },
      { key: "featured", label: "Featured", type: "boolean", table: true, notion: { name: "Featured", type: "checkbox" } },
      { key: "slug", label: "Slug", type: "text", required: true, notion: { name: "Slug", type: "text", aliases: [{ name: "Slug", type: "rich_text" }] } },
      { key: "tools", label: "Tools", type: "textarea", placeholder: "Multi-select tool tags; one per line or comma separated.", notion: { name: "Tools", type: "multi_select", aliases: [{ name: "Tools", type: "rich_text" }] } },
      { key: "publishedAt", label: "Date", type: "date", table: true, notion: { name: "Date", type: "date" } },
      { key: "primaryType", label: "Category", type: "textarea", required: true, table: true, placeholder: "Studio Project Categories relation page ID.", notion: { name: "Category", type: "relation" } },
      { key: "coverImage", label: "Cover", type: "url", required: true, notion: { name: "Cover", type: "files", aliases: [{ name: "Cover", type: "file" }, { name: "Cover", type: "url" }] } },
      { key: "status", label: "展示状态", type: "select", options: workStatusOptions, required: true, table: true, notion: { name: "展示状态", type: "select" } },
      { key: "notionPageBody", label: "Notion Page Body", type: "readonly", readOnly: true, description: "Rendered from the Notion page body in the public detail page." },
      { key: "notionUrl", label: "Notion Page", type: "readonly", readOnly: true },
      { key: "createdAt", label: "Created At", type: "readonly", readOnly: true, notion: { name: "Created At", type: "created_time" } },
      { key: "updatedAt", label: "Updated At", type: "readonly", readOnly: true, table: true, notion: { name: "Updated At", type: "last_edited_time" } }
    ]
  },
  "work-types": {
    key: "work-types",
    label: "Project Categories",
    navLabel: "Categories",
    description: "Studio Project Categories source for Works filters and project category display.",
    apiPath: "work-types",
    databaseEnv: ["NOTION_WORK_TYPES_DATABASE_ID", "NOTION_STUDIO_PROJECT_CATEGORIES_DATABASE_ID"],
    notionTableName: "Studio Project Categories",
    titleField: "nameEn",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["nameEn", "slug", "workCount", "syncStatus", "order"],
    fields: [
      { key: "syncStatus", label: "同步状态", type: "select", options: syncStatusOptions, table: true, notion: { name: "同步状态", type: "select" } },
      { key: "order", label: "Order", type: "number", table: true, notion: { name: "Order", type: "number" } },
      { key: "nameEn", label: "Category", type: "text", required: true, table: true, notion: { name: "Category", type: "title" } },
      { key: "slug", label: "Slug", type: "text", required: true, table: true, notion: { name: "Category", type: "title" } },
      { key: "iconUrl", label: "Cover", type: "url", notion: { name: "Cover", type: "files", aliases: [{ name: "Cover", type: "file" }, { name: "Cover", type: "url" }] } },
      { key: "workCount", label: "Works", type: "readonly", readOnly: true, table: true }
    ]
  },
  tools: {
    key: "tools",
    label: "Tools",
    navLabel: "Tools",
    description: "Studio Tools source for About skills and project tool icon mapping.",
    apiPath: "tools",
    databaseEnv: ["NOTION_TOOLS_DATABASE_ID", "NOTION_STUDIO_TOOLS_DATABASE_ID", "NOTION_TOOLS_DATA_SOURCE_ID"],
    notionTableName: "Studio Tools",
    titleField: "name",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["name", "category", "homeVisible", "syncStatus", "order", "updatedAt"],
    fields: [
      { key: "order", label: "Order", type: "number", table: true, notion: { name: "Order", type: "number" } },
      { key: "name", label: "Name", type: "text", required: true, table: true, notion: { name: "Name", type: "title" } },
      { key: "syncStatus", label: "同步状态", type: "select", options: syncStatusOptions, table: true, notion: { name: "同步状态", type: "select" } },
      { key: "category", label: "Category", type: "select", options: toolCategoryOptions, required: true, table: true, notion: { name: "Category", type: "select" } },
      { key: "homeVisible", label: "Active", type: "boolean", table: true, notion: { name: "Active", type: "checkbox" } },
      { key: "iconUrl", label: "Logo SVG", type: "url", notion: { name: "Logo SVG", type: "files", aliases: [{ name: "Logo SVG", type: "file" }, { name: "Logo SVG", type: "url" }] } },
      { key: "updatedAt", label: "Updated At", type: "readonly", readOnly: true, table: true, notion: { name: "Updated At", type: "last_edited_time" } }
    ]
  },
  "about-experience": {
    key: "about-experience",
    label: "About Experience",
    navLabel: "About",
    description: "Local fallback experience rows used by the About page timeline/list.",
    apiPath: "about-experience",
    databaseEnv: ["NOTION_ABOUT_EXPERIENCE_DATABASE_ID", "NOTION_STUDIO_ABOUT_EXPERIENCE_DATABASE_ID"],
    notionTableName: "Studio About Experience",
    titleField: "title",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["title", "organization", "startDate", "endDate", "visible", "order"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, table: true, notion: { name: "Title", type: "title", aliases: [{ name: "Role", type: "title" }] } },
      { key: "organization", label: "Organization", type: "text", table: true, notion: { name: "Organization", type: "rich_text", aliases: [{ name: "Company", type: "rich_text" }] } },
      { key: "location", label: "Location", type: "text", notion: { name: "Location", type: "rich_text" } },
      { key: "startDate", label: "Start Date", type: "date", table: true, notion: { name: "Start Date", type: "date" } },
      { key: "endDate", label: "End Date", type: "date", table: true, notion: { name: "End Date", type: "date" } },
      { key: "isCurrent", label: "Is Current", type: "boolean", notion: { name: "Is Current", type: "checkbox" } },
      { key: "descriptionEn", label: "Description EN", type: "textarea", notion: { name: "Description EN", type: "rich_text" } },
      { key: "descriptionCn", label: "Description CN", type: "textarea", notion: { name: "Description CN", type: "rich_text" } },
      { key: "tags", label: "Tags", type: "textarea", notion: { name: "Tags", type: "multi_select", aliases: [{ name: "Tags", type: "rich_text" }] } },
      { key: "order", label: "Order", type: "number", table: true, notion: { name: "Order", type: "number" } },
      { key: "visible", label: "Visible", type: "boolean", table: true, notion: { name: "Visible", type: "checkbox" } },
      { key: "updatedAt", label: "Updated At", type: "readonly", readOnly: true, notion: { name: "Updated At", type: "last_edited_time" } }
    ]
  },
  "about-skills": {
    key: "about-skills",
    label: "About Skills",
    navLabel: "Skills",
    description: "Local fallback skill groups for the About page.",
    apiPath: "about-skills",
    databaseEnv: [],
    notionTableName: "Studio About Skills",
    titleField: "groupNameEn",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["groupNameEn", "groupNameCn", "visible", "order"],
    fields: [
      { key: "groupNameEn", label: "Group Name EN", type: "text", required: true, table: true, notion: { name: "Group Name EN", type: "title", aliases: [{ name: "Name EN", type: "title" }] } },
      { key: "groupNameCn", label: "Group Name CN", type: "text", table: true, notion: { name: "Group Name CN", type: "rich_text", aliases: [{ name: "Name CN", type: "rich_text" }] } },
      { key: "items", label: "Items", type: "textarea", placeholder: "One skill per line", notion: { name: "Items", type: "rich_text" } },
      { key: "descriptionEn", label: "Description EN", type: "textarea", notion: { name: "Description EN", type: "rich_text" } },
      { key: "descriptionCn", label: "Description CN", type: "textarea", notion: { name: "Description CN", type: "rich_text" } },
      { key: "order", label: "Order", type: "number", table: true, notion: { name: "Order", type: "number" } },
      { key: "visible", label: "Visible", type: "boolean", table: true, notion: { name: "Visible", type: "checkbox" } }
    ]
  },
  "social-links": {
    key: "social-links",
    label: "Social Links",
    navLabel: "Social Links",
    description: "Studio Social Links source for About, Footer and Contact destinations.",
    apiPath: "social-links",
    databaseEnv: ["NOTION_SOCIAL_LINKS_DATABASE_ID", "NOTION_STUDIO_SOCIAL_LINKS_DATABASE_ID", "NOTION_SOCIAL_LINKS_DATA_SOURCE_ID"],
    notionTableName: "Studio Social Links",
    titleField: "platform",
    allowCreate: true,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["platform", "labelEn", "type", "active", "syncStatus", "order"],
    fields: [
      { key: "syncStatus", label: "同步状态", type: "select", options: syncStatusOptions, table: true, notion: { name: "同步状态", type: "select" } },
      { key: "order", label: "Order", type: "number", table: true, notion: { name: "Order", type: "number" } },
      { key: "platform", label: "Platform", type: "text", required: true, table: true, notion: { name: "Platform", type: "title" } },
      { key: "active", label: "Active", type: "boolean", table: true, notion: { name: "Active", type: "checkbox" } },
      { key: "labelEn", label: "Display Label", type: "text", table: true, notion: { name: "Display Label", type: "text", aliases: [{ name: "Display Label", type: "rich_text" }] } },
      { key: "url", label: "URL", type: "url", required: true, notion: { name: "URL", type: "url" } },
      { key: "clickAction", label: "点击处理方式", type: "select", options: clickActionOptions, notion: { name: "点击处理方式", type: "select" } },
      { key: "type", label: "Group", type: "select", options: socialTypeOptions, table: true, notion: { name: "Group", type: "select" } },
      { key: "iconUrl", label: "Black Logo", type: "url", notion: { name: "Black Logo", type: "files", aliases: [{ name: "Black Logo", type: "file" }, { name: "Black Logo", type: "url" }, { name: "Color Logo", type: "files" }, { name: "Color Logo", type: "file" }, { name: "Color Logo", type: "url" }] } },
      { key: "colorIconUrl", label: "Color Logo", type: "url", notion: { name: "Color Logo", type: "files", aliases: [{ name: "Color Logo", type: "file" }, { name: "Color Logo", type: "url" }] } },
      { key: "cardBackgroundColor", label: "卡片背景色号", type: "text", notion: { name: "卡片背景色号", type: "text", aliases: [{ name: "卡片背景色号", type: "rich_text" }] } },
      { key: "cardLogoColor", label: "卡片logo色号", type: "text", notion: { name: "卡片logo色号", type: "text", aliases: [{ name: "卡片logo色号", type: "rich_text" }] } },
      { key: "updatedAt", label: "Updated At", type: "readonly", readOnly: true, notion: { name: "Updated At", type: "last_edited_time" } }
    ]
  },
  "media-assets": {
    key: "media-assets",
    label: "Media Library",
    navLabel: "Media",
    description: "Local OSS-backed media records for uploads.",
    apiPath: "media-assets",
    databaseEnv: [],
    notionTableName: "Studio Media Assets",
    titleField: "title",
    allowCreate: false,
    allowDelete: true,
    deleteLabel: "Delete",
    tableColumns: ["title", "type", "usage", "url", "objectKey", "updatedAt"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, table: true, notion: { name: "Title", type: "title" } },
      { key: "url", label: "File URL", type: "readonly", readOnly: true, required: true, table: true, notion: { name: "File URL", type: "url", aliases: [{ name: "URL", type: "url" }] } },
      { key: "objectKey", label: "Object Key", type: "readonly", readOnly: true, table: true, notion: { name: "Object Key", type: "rich_text" } },
      { key: "type", label: "Type", type: "select", options: mediaTypeOptions, table: true, notion: { name: "Type", type: "select" } },
      { key: "usage", label: "Usage", type: "select", options: mediaUsageOptions, table: true, notion: { name: "Usage", type: "select" } },
      { key: "altEn", label: "Alt EN", type: "text", notion: { name: "Alt EN", type: "rich_text", aliases: [{ name: "Alt Text", type: "rich_text" }] } },
      { key: "altCn", label: "Alt CN", type: "text", notion: { name: "Alt CN", type: "rich_text" } },
      { key: "size", label: "Size", type: "readonly", readOnly: true, notion: { name: "Size", type: "rich_text" } },
      { key: "width", label: "Width", type: "readonly", readOnly: true, notion: { name: "Width", type: "number" } },
      { key: "height", label: "Height", type: "readonly", readOnly: true, notion: { name: "Height", type: "number" } },
      { key: "relatedWork", label: "Related Work", type: "textarea", placeholder: "Studio Works relation page IDs, one per line", notion: { name: "Related Work", type: "relation" } },
      { key: "uploadedAt", label: "Uploaded At", type: "readonly", readOnly: true, notion: { name: "Uploaded At", type: "date" } },
      { key: "updatedAt", label: "Updated At", type: "readonly", readOnly: true, table: true, notion: { name: "Updated At", type: "last_edited_time" } }
    ]
  },
  "contact-messages": {
    key: "contact-messages",
    label: "Contact Messages",
    navLabel: "Messages",
    description: "Front-end contact form submissions. Raw name, email, message and source stay read-only.",
    apiPath: "contact-messages",
    databaseEnv: ["NOTION_CONTACT_MESSAGES_DATABASE_ID", "NOTION_STUDIO_CONTACT_MESSAGES_DATABASE_ID", "NOTION_CONTACT_MESSAGES_DATA_SOURCE_ID"],
    notionTableName: "Studio Contact Messages",
    titleField: "name",
    allowCreate: false,
    allowDelete: true,
    deleteLabel: "Archive",
    tableColumns: ["name", "email", "sourcePage", "status", "createdAt"],
    fields: [
      { key: "name", label: "Name", type: "readonly", readOnly: true, table: true, notion: { name: "Name", type: "title" } },
      { key: "createdAt", label: "Created At", type: "readonly", readOnly: true, table: true, notion: { name: "Created At", type: "date", aliases: [{ name: "Created At", type: "created_time" }] } },
      { key: "email", label: "Email", type: "readonly", readOnly: true, table: true, notion: { name: "Email", type: "email" } },
      { key: "message", label: "Message", type: "textarea", readOnly: true, notion: { name: "Message", type: "text", aliases: [{ name: "Message", type: "rich_text" }] } },
      { key: "sourcePage", label: "Source Page", type: "readonly", readOnly: true, table: true, notion: { name: "Source Page", type: "url", aliases: [{ name: "Source Page", type: "rich_text" }] } },
      { key: "status", label: "Status", type: "select", options: ["New", "Read", "Replied", "Archived"], table: true, notion: { name: "Status", type: "select" } },
      { key: "mailNotifyStatus", label: "邮件通知状态", type: "readonly", readOnly: true, notion: { name: "邮件通知状态", type: "status" } },
      { key: "notionNotifyStatus", label: "Notion 通知状态", type: "readonly", readOnly: true, notion: { name: "Notion 通知状态", type: "status" } }
    ]
  }
};

export const adminNavigation: AdminNavItem[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "page-sections", label: "Page Content" },
  { key: "works", label: "Works" },
  { key: "work-types", label: "Categories" },
  { key: "tools", label: "Tools" },
  { key: "about-experience", label: "About" },
  { key: "about-skills", label: "Skills" },
  { key: "social-links", label: "Social Links" },
  { key: "media-assets", label: "Media Library" },
  { key: "contact-messages", label: "Contact Messages" },
  { key: "integrations", label: "Integrations" },
  { key: "security", label: "Security" }
];

export const collectionConfigList = Object.values(collectionConfigs);

export function getCollectionConfig(key: string): AdminCollectionConfig | undefined {
  return collectionConfigs[key as AdminCollectionKey];
}

export function isCollectionKey(key: string): key is AdminCollectionKey {
  return key in collectionConfigs;
}
