export const SITE_TASK_STATUSES = ["할 일", "진행 중", "완료"] as const;

export type SiteTaskStatus = (typeof SITE_TASK_STATUSES)[number];

export type SiteTask = {
  id: string;
  siteId: string;
  title: string;
  description: string;
  status: SiteTaskStatus;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
};
