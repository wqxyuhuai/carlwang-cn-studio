export type WorkStatus =
  | "Draft"
  | "Ready"
  | "Syncing"
  | "Synced"
  | "Published"
  | "Failed"
  | "Archived";

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
  color?: string;
  background?: string;
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
  slug: string;
  title: string;
  year: string;
  category: string;
  role: string;
  tools: string[];
  intro: string;
  coverImage: MediaItem;
  gallery: MediaItem[];
  content: NotionBlock[];
  featured: boolean;
  status: WorkStatus;
  order: number;
  seoTitle?: string;
  seoDescription?: string;
};

export type AboutProfile = {
  name: string;
  title: string;
  intro: string;
  bio: string;
  skills: { name: string; items: string[] }[];
  experience: { company: string; role: string; period: string; summary: string }[];
  socialLinks: { label: string; href: string }[];
  email: string;
};

export type SiteSettings = {
  defaultTheme: "light" | "dark" | "system";
  accentColor: string;
  homeHeroTitle: string;
  homeHeroDescription: string;
  seoTitle: string;
  seoDescription: string;
  socialLinks: { label: string; href: string }[];
};

export type StudioData = {
  settings: SiteSettings;
  works: Work[];
  about: AboutProfile;
  sync: {
    source: "fallback" | "oss";
    lastSyncedAt?: string;
    error?: string;
  };
};
