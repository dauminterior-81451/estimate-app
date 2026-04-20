"use client";

import type { Site } from "@/types/site";
import {
  isObjectRecord,
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from "@/repositories/storage";

const SITES_STORAGE_KEY = "sites";
const LEGACY_SITES_STORAGE_KEY = "site-storage";

const createTimestamp = () => new Date().toISOString();

const createDefaultSite = (overrides: Partial<Site> = {}): Site => ({
  id: Date.now().toString(),
  customerId: null,
  customerName: "새 고객",
  phone: "",
  email: "",
  siteName: "새 현장",
  createdAt: new Date().toISOString().slice(0, 10),
  updatedAt: null,
  status: "작성중",
  ...overrides,
});

const normalizeSite = (value: unknown): Site | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  return {
    id: typeof value.id === "string" && value.id ? value.id : Date.now().toString(),
    customerId:
      typeof value.customerId === "string" && value.customerId
        ? value.customerId
        : null,
    customerName:
      typeof value.customerName === "string" ? value.customerName : "새 고객",
    phone: typeof value.phone === "string" ? value.phone : "",
    email: typeof value.email === "string" ? value.email : "",
    siteName: typeof value.siteName === "string" ? value.siteName : "새 현장",
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : new Date().toISOString().slice(0, 10),
    updatedAt:
      typeof value.updatedAt === "string" || value.updatedAt === null
        ? (value.updatedAt as string | null)
        : null,
    status: value.status === "발송완료" ? "발송완료" : "작성중",
  };
};

const normalizeSites = (value: unknown): Site[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeSite(entry))
    .filter((entry): entry is Site => entry !== null);
};

const readLegacySites = (): Site[] => {
  const legacy = readStorageValue(LEGACY_SITES_STORAGE_KEY);

  if (!isObjectRecord(legacy) || !("state" in legacy)) {
    return [];
  }

  const state = legacy.state;

  if (!isObjectRecord(state) || !("sites" in state)) {
    return [];
  }

  return normalizeSites(state.sites);
};

const readSites = (): Site[] => {
  const currentRaw = readStorageValue(SITES_STORAGE_KEY);

  if (Array.isArray(currentRaw)) {
    return normalizeSites(currentRaw);
  }

  const legacy = readLegacySites();

  if (legacy.length > 0) {
    writeStorageValue(SITES_STORAGE_KEY, legacy);
    removeStorageValue(LEGACY_SITES_STORAGE_KEY);
    return legacy;
  }

  return [
    {
      id: "1",
      customerId: null,
      customerName: "샘플 고객",
      phone: "010-0000-0000",
      email: "sample@email.com",
      siteName: "용산구 34평 아파트",
      createdAt: "2026-04-15",
      updatedAt: null,
      status: "작성중",
    },
  ];
};

const writeSites = (sites: Site[]) => {
  writeStorageValue(SITES_STORAGE_KEY, sites);
};

export const siteRepository = {
  createDefault(overrides: Partial<Site> = {}) {
    return createDefaultSite(overrides);
  },

  getAll(): Site[] {
    return readSites();
  },

  getBySiteId(siteId: string): Site | null {
    return this.getById(siteId);
  },

  getById(id: string): Site | null {
    return readSites().find((site) => site.id === id) ?? null;
  },

  save(site: Site): Site {
    const sites = readSites();
    const existingIndex = sites.findIndex((entry) => entry.id === site.id);
    const nextSite = {
      ...site,
      updatedAt: createTimestamp(),
    };

    if (existingIndex >= 0) {
      sites[existingIndex] = nextSite;
    } else {
      sites.push(nextSite);
    }

    writeSites(sites);
    return nextSite;
  },

  update(id: string, partial: Partial<Site>): Site | null {
    const current = this.getById(id);

    if (!current) {
      return null;
    }

    return this.save({
      ...current,
      ...partial,
      id: current.id,
      createdAt: current.createdAt,
    });
  },

  delete(id: string): boolean {
    const sites = readSites();
    const nextSites = sites.filter((site) => site.id !== id);

    if (nextSites.length === sites.length) {
      return false;
    }

    writeSites(nextSites);
    return true;
  },
};
