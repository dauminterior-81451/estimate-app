import { removeStorageValue } from "@/repositories/storage";

export const SITE_STORAGE_KEY = "sites";

export const getSiteEstimateStorageKey = (siteId: string) =>
  `site:${siteId}:estimate`;
export const getLegacyEstimateStorageKey = (siteId: string) =>
  `estimate:${siteId}`;
export const getSiteNotesStorageKey = (siteId: string) => `site:${siteId}:notes`;
export const getSiteFilesStorageKey = (siteId: string) => `site:${siteId}:files`;
export const getSiteTasksStorageKey = (siteId: string) => `site:${siteId}:tasks`;
export const getSiteContractStorageKey = (siteId: string) =>
  `site:${siteId}:contract`;
export const getSitePreviewStorageKey = (siteId: string) =>
  `site:${siteId}:preview`;

export const getSiteRelatedStorageKeys = (siteId: string) => [
  getSiteEstimateStorageKey(siteId),
  getLegacyEstimateStorageKey(siteId),
  getSitePreviewStorageKey(siteId),
  getSiteNotesStorageKey(siteId),
  getSiteFilesStorageKey(siteId),
  getSiteTasksStorageKey(siteId),
  getSiteContractStorageKey(siteId),
];

export const clearSiteRelatedStorage = (siteId: string) => {
  for (const key of getSiteRelatedStorageKeys(siteId)) {
    removeStorageValue(key);
  }
};
