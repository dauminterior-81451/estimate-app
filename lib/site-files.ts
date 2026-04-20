import type { SiteFile } from "@/types/site-file";

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createTimestamp = () => new Date().toISOString();

export const formatSiteFileDate = (value: string) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("ko-KR");
};

export const createSiteFile = (siteId: string): SiteFile => {
  const now = createTimestamp();

  return {
    id: createId(),
    siteId,
    name: "",
    description: "",
    category: "기타",
    url: "",
    createdAt: now,
    updatedAt: now,
  };
};
