"use client";

import { createSiteFile } from "@/lib/site-files";
import { getSiteFilesStorageKey } from "@/lib/site-storage";
import { siteRepository } from "@/repositories/siteRepository";
import {
  isObjectRecord,
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from "@/repositories/storage";
import {
  SITE_FILE_CATEGORIES,
  type SiteFile,
  type SiteFileCategory,
} from "@/types/site-file";

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isSiteFileCategory = (value: unknown): value is SiteFileCategory =>
  typeof value === "string" &&
  SITE_FILE_CATEGORIES.includes(value as SiteFileCategory);

const normalizeFile = (value: unknown, siteId: string): SiteFile | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  return {
    id: typeof value.id === "string" ? value.id : createId(),
    siteId:
      typeof value.siteId === "string" && value.siteId ? value.siteId : siteId,
    name: typeof value.name === "string" ? value.name : "",
    description: typeof value.description === "string" ? value.description : "",
    category: isSiteFileCategory(value.category) ? value.category : "기타",
    url: typeof value.url === "string" ? value.url : "",
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString(),
  };
};

const readFiles = (siteId: string): SiteFile[] => {
  const parsed = readStorageValue(getSiteFilesStorageKey(siteId));

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((entry) => normalizeFile(entry, siteId))
    .filter((entry): entry is SiteFile => entry !== null)
    .filter((entry) => entry.siteId === siteId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
};

const writeFiles = (siteId: string, files: SiteFile[]) => {
  writeStorageValue(getSiteFilesStorageKey(siteId), files);
};

export const fileRepository = {
  createDefault(siteId: string) {
    return createSiteFile(siteId);
  },

  getAll(): SiteFile[] {
    return siteRepository.getAll().flatMap((site) => readFiles(site.id));
  },

  getBySiteId(siteId: string): SiteFile[] {
    return readFiles(siteId);
  },

  getById(id: string): SiteFile | null {
    return this.getAll().find((file) => file.id === id) ?? null;
  },

  save(file: SiteFile): SiteFile {
    const files = readFiles(file.siteId);
    const index = files.findIndex((entry) => entry.id === file.id);
    const next = {
      ...file,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      files[index] = next;
    } else {
      files.unshift(next);
    }

    writeFiles(file.siteId, files);
    return next;
  },

  update(id: string, partial: Partial<SiteFile>): SiteFile | null {
    const current = this.getById(id);

    if (!current) {
      return null;
    }

    return this.save({
      ...current,
      ...partial,
      id: current.id,
      siteId: current.siteId,
    });
  },

  delete(id: string): boolean {
    const current = this.getById(id);

    if (!current) {
      return false;
    }

    const files = readFiles(current.siteId).filter((file) => file.id !== id);
    writeFiles(current.siteId, files);
    return true;
  },

  deleteBySiteId(siteId: string) {
    removeStorageValue(getSiteFilesStorageKey(siteId));
  },
};
