"use client";

import {
  createDefaultEstimateDraft,
  normalizeEstimateDraft,
} from "@/lib/estimate-draft";
import { siteRepository } from "@/repositories/siteRepository";
import {
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from "@/repositories/storage";
import type { Estimate, EstimateDraft } from "@/types/estimate";

const getEstimateStorageKey = (siteId: string) => `site:${siteId}:estimate`;
const getLegacyEstimateStorageKey = (siteId: string) => `estimate:${siteId}`;

const toEstimate = (
  siteId: string,
  draft: EstimateDraft,
  id = siteId
): Estimate => ({
  id,
  siteId,
  ...draft,
});

const toDraft = (estimate: Estimate): EstimateDraft => ({
  version: estimate.version,
  name: estimate.name,
  estimateDate: estimate.estimateDate,
  note: estimate.note,
  title: estimate.title,
  vat: estimate.vat,
  categories: estimate.categories,
  updatedAt: estimate.updatedAt,
});

const cloneEstimateCategories = (categories: EstimateDraft["categories"]) =>
  JSON.parse(JSON.stringify(categories)) as EstimateDraft["categories"];

const sortEstimateDrafts = (drafts: EstimateDraft[]) =>
  [...drafts].sort((a, b) => b.version - a.version);

const normalizeEstimateDrafts = (value: unknown): EstimateDraft[] => {
  if (Array.isArray(value)) {
    return sortEstimateDrafts(value.map((entry) => normalizeEstimateDraft(entry)));
  }

  if (value) {
    return [normalizeEstimateDraft(value)];
  }

  return [];
};

const writeEstimateDrafts = (siteId: string, drafts: EstimateDraft[]) => {
  writeStorageValue(getEstimateStorageKey(siteId), sortEstimateDrafts(drafts));
  removeStorageValue(getLegacyEstimateStorageKey(siteId));
};

const readEstimateDrafts = (siteId: string): EstimateDraft[] => {
  const current = readStorageValue(getEstimateStorageKey(siteId));
  const legacy = current ?? readStorageValue(getLegacyEstimateStorageKey(siteId));

  if (!legacy) {
    return [];
  }

  const drafts = normalizeEstimateDrafts(legacy);

  if (current === null || !Array.isArray(current)) {
    writeEstimateDrafts(siteId, drafts);
    removeStorageValue(getLegacyEstimateStorageKey(siteId));
  } else {
    const normalizedCurrent = normalizeEstimateDrafts(current);
    if (JSON.stringify(current) !== JSON.stringify(normalizedCurrent)) {
      writeEstimateDrafts(siteId, normalizedCurrent);
      return normalizedCurrent;
    }
  }

  return drafts;
};

export const estimateRepository = {
  getAll(): Estimate[] {
    return siteRepository
      .getAll()
      .map((site) => {
        const draft = this.getEstimate(site.id);
        return draft ? toEstimate(site.id, draft) : null;
      })
      .filter((entry): entry is Estimate => entry !== null);
  },

  getEstimatesBySite(siteId: string): Estimate[] {
    return readEstimateDrafts(siteId).map((draft) =>
      toEstimate(siteId, draft, `${siteId}:${draft.version}`)
    );
  },

  getEstimate(siteId: string): EstimateDraft | null {
    return readEstimateDrafts(siteId)[0] ?? null;
  },

  getBySiteId(siteId: string): Estimate | null {
    const draft = this.getEstimate(siteId);
    return draft ? toEstimate(siteId, draft) : null;
  },

  getById(id: string): Estimate | null {
    if (id.includes(":")) {
      const [siteId, versionText] = id.split(":");
      const version = Number(versionText);

      if (!siteId || Number.isNaN(version)) {
        return null;
      }

      const estimate = this.getEstimatesBySite(siteId).find(
        (entry) => entry.version === version
      );

      return estimate ?? null;
    }

    return this.getBySiteId(id);
  },

  createEstimate(estimate: Estimate): Estimate {
    const drafts = readEstimateDrafts(estimate.siteId);
    const nextDraft = toDraft(estimate);
    const nextDrafts = sortEstimateDrafts([
      ...drafts.filter((draft) => draft.version !== estimate.version),
      nextDraft,
    ]);

    writeEstimateDrafts(estimate.siteId, nextDrafts);

    return toEstimate(
      estimate.siteId,
      nextDraft,
      `${estimate.siteId}:${nextDraft.version}`
    );
  },

  copyEstimateFromLatest(siteId: string): Estimate | null {
    const latestEstimate = this.getEstimatesBySite(siteId)[0] ?? null;

    if (!latestEstimate) {
      return null;
    }

    const nextVersion = (latestEstimate.version ?? 1) + 1;
    const now = new Date().toISOString();

    return this.createEstimate({
      ...latestEstimate,
      id: `${siteId}:${nextVersion}`,
      siteId,
      version: nextVersion,
      name: `${nextVersion}차 견적`,
      categories: cloneEstimateCategories(latestEstimate.categories),
      updatedAt: now,
    });
  },

  save(estimate: Estimate): Estimate {
    const drafts = readEstimateDrafts(estimate.siteId);
    const nextDraft = toDraft(estimate);
    const nextDrafts = sortEstimateDrafts([
      ...drafts.filter((draft) => draft.version !== estimate.version),
      nextDraft,
    ]);

    writeEstimateDrafts(estimate.siteId, nextDrafts);
    return estimate;
  },

  update(id: string, partial: Partial<EstimateDraft>): Estimate | null {
    const current = this.getById(id);

    if (!current) {
      return null;
    }

    const next = {
      ...current,
      ...partial,
      id: current.id,
      siteId: current.siteId,
    };

    return this.save(next);
  },

  delete(id: string): boolean {
    const siteId = id.includes(":") ? id.split(":")[0] : id;
    const exists =
      readStorageValue(getEstimateStorageKey(siteId)) !== null ||
      readStorageValue(getLegacyEstimateStorageKey(siteId)) !== null;

    removeStorageValue(getEstimateStorageKey(siteId));
    removeStorageValue(getLegacyEstimateStorageKey(siteId));
    return exists;
  },

  createDefault(siteId: string): EstimateDraft {
    return createDefaultEstimateDraft();
  },
};
