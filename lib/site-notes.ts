import type { SiteNote } from "@/types/site-note";

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createSiteNote = (siteId: string): SiteNote => {
  const now = new Date().toLocaleString("ko-KR");

  return {
    id: createId(),
    siteId,
    title: "",
    content: "",
    createdAt: now,
    updatedAt: now,
  };
};
