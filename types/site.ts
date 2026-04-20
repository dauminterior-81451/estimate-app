export type SiteStatus = "작성중" | "발송완료";

export type Site = {
  id: string;
  customerId?: string | null;
  customerName: string;
  phone: string;
  email: string;
  siteName: string;
  createdAt: string;
  updatedAt?: string | null;
  status: SiteStatus;
};
