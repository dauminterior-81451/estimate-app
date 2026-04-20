export const CONTRACT_STATUSES = [
  "draft",
  "signed",
  "in_progress",
  "completed",
] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export type Contract = {
  id: string;
  siteId: string;
  status: ContractStatus;
  totalAmount?: number | null;
  note: string;
  createdAt: string;
  updatedAt: string;
  signedAt?: string | null;
};
