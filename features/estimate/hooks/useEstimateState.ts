"use client";

import { useState } from "react";
import type {
  EstimateCategory,
  EstimateDraft,
  EstimateItem,
} from "@/types/estimate";

const createLocalId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const cloneEstimateItem = (item: EstimateItem): EstimateItem => ({
  ...item,
  id: createLocalId(),
});

const cloneEstimateCategory = (
  category: EstimateCategory
): EstimateCategory => ({
  ...category,
  id: createLocalId(),
  items: category.items.map(cloneEstimateItem),
});

const createDuplicateName = (name: string, fallback: string) => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return fallback;
  }

  return `${trimmedName.replace(/\s+복사본$/, "")} 복사본`;
};

export function useEstimateState(initialDraft: EstimateDraft) {
  const [draft, setDraft] = useState<EstimateDraft>(initialDraft);

  const updateDraft = (updater: (current: EstimateDraft) => EstimateDraft) => {
    setDraft((current) => updater(current));
  };

  const updateCategory = (
    categoryId: string,
    updater: (category: EstimateCategory) => EstimateCategory
  ) => {
    updateDraft((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId ? updater(category) : category
      ),
    }));
  };

  const updateItem = (
    categoryId: string,
    itemId: string,
    updater: (item: EstimateItem) => EstimateItem
  ) => {
    updateCategory(categoryId, (category) => ({
      ...category,
      items: category.items.map((item) =>
        item.id === itemId ? updater(item) : item
      ),
    }));
  };

  const addCategory = () => {
    const newCategory: EstimateCategory = {
      id: createLocalId(),
      name: "신규 품목",
      items: [
        {
          id: createLocalId(),
          name: "",
          qty: 1,
          price: 0,
        },
      ],
    };

    updateDraft((current) => ({
      ...current,
      categories: [...current.categories, newCategory],
    }));
  };

  const duplicateCategory = (categoryId: string) => {
    updateDraft((current) => {
      const categoryIndex = current.categories.findIndex(
        (category) => category.id === categoryId
      );

      if (categoryIndex === -1) {
        return current;
      }

      const sourceCategory = current.categories[categoryIndex];
      const duplicatedCategory = cloneEstimateCategory({
        ...sourceCategory,
        name: createDuplicateName(sourceCategory.name, "복사본 품목"),
      });
      const categories = [...current.categories];

      categories.splice(categoryIndex + 1, 0, duplicatedCategory);

      return {
        ...current,
        categories,
      };
    });
  };

  const removeCategory = (categoryId: string) => {
    updateDraft((current) => ({
      ...current,
      categories: current.categories.filter(
        (category) => category.id !== categoryId
      ),
    }));
  };

  const addItem = (categoryId: string) => {
    updateCategory(categoryId, (category) => ({
      ...category,
      items: [
        ...category.items,
        {
          id: createLocalId(),
          name: "",
          qty: 1,
          price: 0,
        },
      ],
    }));
  };

  const duplicateItem = (categoryId: string, itemId: string) => {
    updateCategory(categoryId, (category) => {
      const itemIndex = category.items.findIndex((item) => item.id === itemId);

      if (itemIndex === -1) {
        return category;
      }

      const sourceItem = category.items[itemIndex];
      const duplicatedItem = cloneEstimateItem({
        ...sourceItem,
        name: createDuplicateName(sourceItem.name, "복사본 항목"),
      });
      const items = [...category.items];

      items.splice(itemIndex + 1, 0, duplicatedItem);

      return {
        ...category,
        items,
      };
    });
  };

  const removeItem = (categoryId: string, itemId: string) => {
    updateCategory(categoryId, (category) => ({
      ...category,
      items: category.items.filter((item) => item.id !== itemId),
    }));
  };

  return {
    draft,
    setDraft,
    updateDraft,
    updateCategory,
    updateItem,
    addCategory,
    duplicateCategory,
    removeCategory,
    addItem,
    duplicateItem,
    removeItem,
  };
}
