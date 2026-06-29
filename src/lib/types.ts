export type WorkStatus = "Draft" | "Published" | "Archived";

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
  publishedAt?: string;
  viewCount: number;
  likeCount: number;
  category: string;
  primaryType?: string;
  primaryTypeSlug?: string;
  tags?: string[];
  featured: boolean;
  featuredOrder?: number;
  order: number;
  cover: MediaItem;
  intro: string;
  introCn?: string;
  overview?: string;
  overviewCn?: string;
  role: string;
  roleCn?: string;
  clientBrand?: string;
  tools: string[];
  gallery: MediaItem[];
  content: NotionBlock[];
  externalUrl?: string;
  notionUrl?: string;
  notionPageId?: string;
};

export type Tool = {
  id?: string;
  name: string;
  category: string;
  iconUrl?: string;
  description?: string;
  descriptionCn?: string;
  homeVisible?: boolean;
  status?: "Published" | "Archived";
  active: boolean;
  order: number;
};

export type WorkType = {
  id?: string;
  nameEn: string;
  nameCn?: string;
  slug: string;
  shortLabel?: string;
  descriptionEn?: string;
  descriptionCn?: string;
  iconUrl?: string;
  homeVisible?: boolean;
  filterVisible?: boolean;
  order: number;
  status?: "Published" | "Archived";
  workCount?: number;
};

export type SocialLink = {
  id?: string;
  platform: string;
  label: string;
  labelCn?: string;
  url: string;
  handle?: string;
  group: "Social" | "Portfolio" | "Contact" | "Footer" | "Form";
  type?: "Social" | "Portfolio" | "Contact" | "Footer" | "Form";
  cardImageUrl?: string;
  iconUrl?: string;
  colorIconUrl?: string;
  lightColorIconUrl?: string;
  footerIconUrl?: string;
  cardBackgroundColor?: string;
  cardLogoColor?: string;
  footerVisible?: boolean;
  contactVisible?: boolean;
  status?: "Published" | "Archived";
  active: boolean;
  order: number;
};

export type Experience = {
  id: string;
  title: string;
  organization: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  dateLabel?: string;
  isCurrent?: boolean;
  descriptionEn?: string;
  descriptionCn?: string;
  tags?: string[];
  imageUrl?: string;
  order: number;
  visible: boolean;
};

export type SiteSettings = {
  designUrl: string;
  previewUrl: string;
  contentUrl: string;
  homeHeroTitle: string;
  homeHeroDescription: string;
  seoTitle: string;
  seoDescription: string;
  defaultLanguage?: string;
  logoUrl?: string;
  faviconUrl?: string;
  footerCopyright?: string;
  contactEmail?: string;
  ossPublicBaseUrl?: string;
  notionWorkspaceName?: string;
};

export type StudioData = {
  settings: SiteSettings;
  works: Work[];
  workTypes?: WorkType[];
  tools: Tool[];
  socials: SocialLink[];
  experiences?: Experience[];
  sync: {
    source: "oss" | "fallback";
    error?: string;
  };
};
