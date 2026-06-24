export type WorkStatus = "Draft" | "Ready" | "Published" | "Archived";

export type MediaItem = {
  type: "image" | "video";
  src: string;
  alt: string;
  caption?: string;
  poster?: string;
  width?: number;
  height?: number;
};

export type RichTextSpan = {
  text: string;
  href?: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: "black" | "black60" | "black40" | "black20" | "green";
};

export type NotionBlock =
  | { type: "paragraph"; text: RichTextSpan[] }
  | { type: "heading_1" | "heading_2" | "heading_3"; text: RichTextSpan[] }
  | { type: "bulleted_list" | "numbered_list"; items: RichTextSpan[][] }
  | { type: "quote" | "callout"; text: RichTextSpan[] }
  | { type: "divider" }
  | { type: "image" | "video"; media: MediaItem }
  | { type: "bookmark"; title: string; url: string; description?: string }
  | { type: "column_list"; columns: NotionBlock[][] }
  | { type: "toggle"; title: RichTextSpan[]; children: NotionBlock[] }
  | { type: "unsupported"; label: string };

export type Work = {
  id: string;
  title: string;
  slug: string;
  status: WorkStatus;
  year: number;
  category: "Website" | "Brand" | "UI Product" | "Motion" | "3D Render" | "Campaign" | "Experiment";
  featured: boolean;
  order: number;
  cover: MediaItem;
  intro: string;
  role: string;
  tools: string[];
  gallery: MediaItem[];
  content: NotionBlock[];
};

export type Tool = {
  name: string;
  category: string;
  active: boolean;
  order: number;
};

export type SocialLink = {
  platform: string;
  label: string;
  url: string;
  handle?: string;
  group: "Social" | "Portfolio" | "Contact" | "Footer";
  active: boolean;
  order: number;
};

export type SiteSettings = {
  designUrl: string;
  previewUrl: string;
  contentUrl: string;
  homeHeroTitle: string;
  homeHeroDescription: string;
  seoTitle: string;
  seoDescription: string;
};

export type StudioData = {
  settings: SiteSettings;
  works: Work[];
  tools: Tool[];
  socials: SocialLink[];
  sync: {
    source: "oss" | "fallback";
    error?: string;
  };
};
