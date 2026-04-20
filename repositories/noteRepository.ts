"use client";

import { createSiteNote } from "@/lib/site-notes";
import { getSiteNotesStorageKey } from "@/lib/site-storage";
import { siteRepository } from "@/repositories/siteRepository";
import {
  isObjectRecord,
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from "@/repositories/storage";
import type { SiteNote } from "@/types/site-note";

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeNote = (value: unknown, siteId: string): SiteNote | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  return {
    id: typeof value.id === "string" ? value.id : createId(),
    siteId:
      typeof value.siteId === "string" && value.siteId ? value.siteId : siteId,
    title: typeof value.title === "string" ? value.title : "",
    content: typeof value.content === "string" ? value.content : "",
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : new Date().toLocaleString("ko-KR"),
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toLocaleString("ko-KR"),
  };
};

const readNotes = (siteId: string): SiteNote[] => {
  const parsed = readStorageValue(getSiteNotesStorageKey(siteId));

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((entry) => normalizeNote(entry, siteId))
    .filter((entry): entry is SiteNote => entry !== null)
    .filter((entry) => entry.siteId === siteId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
};

const writeNotes = (siteId: string, notes: SiteNote[]) => {
  writeStorageValue(getSiteNotesStorageKey(siteId), notes);
};

export const noteRepository = {
  createDefault(siteId: string) {
    return createSiteNote(siteId);
  },

  getAll(): SiteNote[] {
    return siteRepository.getAll().flatMap((site) => readNotes(site.id));
  },

  getBySiteId(siteId: string): SiteNote[] {
    return readNotes(siteId);
  },

  getById(id: string): SiteNote | null {
    return this.getAll().find((note) => note.id === id) ?? null;
  },

  save(note: SiteNote): SiteNote {
    const notes = readNotes(note.siteId);
    const index = notes.findIndex((entry) => entry.id === note.id);
    const next = {
      ...note,
      updatedAt: new Date().toLocaleString("ko-KR"),
    };

    if (index >= 0) {
      notes[index] = next;
    } else {
      notes.unshift(next);
    }

    writeNotes(note.siteId, notes);
    return next;
  },

  update(id: string, partial: Partial<SiteNote>): SiteNote | null {
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

    const notes = readNotes(current.siteId).filter((note) => note.id !== id);
    writeNotes(current.siteId, notes);
    return true;
  },

  deleteBySiteId(siteId: string) {
    removeStorageValue(getSiteNotesStorageKey(siteId));
  },
};
