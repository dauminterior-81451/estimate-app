export type EstimateItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type EstimateCategory = {
  id: string;
  name: string;
  items: EstimateItem[];
};

export type EstimateDraft = {
  version: number;
  name: string;
  estimateDate: string;
  note: string;
  title: string;
  vat: boolean;
  categories: EstimateCategory[];
  updatedAt: string | null;
};

export type Estimate = EstimateDraft & {
  id: string;
  siteId: string;
};
