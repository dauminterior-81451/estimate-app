"use client";

import { create } from "zustand";
import { clearSiteRelatedStorage } from "@/lib/site-storage";
import { siteRepository } from "@/repositories/siteRepository";
import type { Site } from "@/types/site";

export type { Site } from "@/types/site";

type SiteState = {
  hydrated: boolean;
  sites: Site[];
  hydrateSites: () => void;
  refreshSites: () => void;
  addSite: (overrides?: Partial<Site>) => string;
  deleteSite: (id: string) => boolean;
  updateSite: <K extends keyof Site>(id: string, key: K, value: Site[K]) => void;
};

export const useSiteStore = create<SiteState>()((set) => ({
  hydrated: false,
  sites: [],

  hydrateSites: () => {
    set({
      sites: siteRepository.getAll(),
      hydrated: true,
    });
  },

  refreshSites: () => {
    set({
      sites: siteRepository.getAll(),
      hydrated: true,
    });
  },

  addSite: (overrides = {}) => {
    const newSite = siteRepository.createDefault({
      customerId: null,
      customerName: "",
      phone: "",
      email: "",
      ...overrides,
    });
    const savedSite = siteRepository.save(newSite);

    set((state) => ({
      sites: [...state.sites, savedSite],
    }));

    return savedSite.id;
  },

  deleteSite: (id) => {
    const deleted = siteRepository.delete(id);

    if (!deleted) {
      return false;
    }

    clearSiteRelatedStorage(id);

    set((state) => ({
      sites: state.sites.filter((site) => site.id !== id),
    }));

    return true;
  },

  updateSite: (id, key, value) => {
    const updated = siteRepository.update(id, {
      [key]: value,
    } as Partial<Site>);

    if (!updated) {
      return;
    }

    set((state) => ({
      sites: state.sites.map((site) => (site.id === id ? updated : site)),
    }));
  },
}));
