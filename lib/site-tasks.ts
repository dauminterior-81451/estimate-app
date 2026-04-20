import type { SiteTask } from "@/types/site-task";

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createTimestamp = () => new Date().toISOString();

export const formatSiteTaskDate = (value: string) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("ko-KR");
};

export const createSiteTask = (siteId: string): SiteTask => {
  const now = createTimestamp();

  return {
    id: createId(),
    siteId,
    title: "",
    description: "",
    status: "할 일",
    dueDate: "",
    createdAt: now,
    updatedAt: now,
  };
};
