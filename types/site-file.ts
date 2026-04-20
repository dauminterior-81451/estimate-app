export const SITE_FILE_CATEGORIES = [
  "도면",
  "계약서",
  "견적서",
  "시공사진",
  "기타",
] as const;

export type SiteFileCategory = (typeof SITE_FILE_CATEGORIES)[number];

export type SiteFile = {
  id: string;
  siteId: string;
  name: string;
  description: string;
  category: SiteFileCategory;
  url: string;
  createdAt: string;
  updatedAt: string;
};
