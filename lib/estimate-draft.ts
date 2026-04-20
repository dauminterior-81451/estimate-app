import type {
  EstimateCategory,
  EstimateDraft,
  EstimateItem,
} from "@/types/estimate";

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createEmptyEstimateItem = (): EstimateItem => ({
  id: createId(),
  name: "",
  qty: 1,
  price: 0,
});

export const createEmptyEstimateCategory = (
  name = "새 품목"
): EstimateCategory => ({
  id: createId(),
  name,
  items: [createEmptyEstimateItem()],
});

export const createDefaultEstimateDraft = (): EstimateDraft => ({
  version: 1,
  name: "1차 견적",
  estimateDate: new Date().toISOString().slice(0, 10),
  note: "",
  title: "기본 견적서",
  vat: true,
  updatedAt: null,
  categories: [createEmptyEstimateCategory("기본 품목")],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeEstimateItem = (value: unknown): EstimateItem | null => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: typeof value.id === "string" ? value.id : createId(),
    name: typeof value.name === "string" ? value.name : "",
    qty: typeof value.qty === "number" ? value.qty : 0,
    price: typeof value.price === "number" ? value.price : 0,
  };
};

const normalizeEstimateCategory = (
  value: unknown
): EstimateCategory | null => {
  if (!isRecord(value)) {
    return null;
  }

  const items = Array.isArray(value.items)
    ? value.items
        .map((item) => normalizeEstimateItem(item))
        .filter((item): item is EstimateItem => item !== null)
    : [];

  return {
    id: typeof value.id === "string" ? value.id : createId(),
    name: typeof value.name === "string" ? value.name : "새 품목",
    items,
  };
};

export const normalizeEstimateDraft = (value: unknown): EstimateDraft => {
  const fallback = createDefaultEstimateDraft();

  if (!isRecord(value)) {
    return fallback;
  }

  const categories = Array.isArray(value.categories)
    ? value.categories
        .map((category) => normalizeEstimateCategory(category))
        .filter((category): category is EstimateCategory => category !== null)
    : fallback.categories;

  return {
    version: typeof value.version === "number" ? value.version : fallback.version,
    name: typeof value.name === "string" ? value.name : fallback.name,
    estimateDate:
      typeof value.estimateDate === "string" && value.estimateDate
        ? value.estimateDate
        : fallback.estimateDate,
    note: typeof value.note === "string" ? value.note : "",
    title: typeof value.title === "string" ? value.title : fallback.title,
    vat: typeof value.vat === "boolean" ? value.vat : fallback.vat,
    updatedAt:
      typeof value.updatedAt === "string" || value.updatedAt === null
        ? value.updatedAt
        : null,
    categories,
  };
};
