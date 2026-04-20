"use client";

import { createSiteTask } from "@/lib/site-tasks";
import { getSiteTasksStorageKey } from "@/lib/site-storage";
import { siteRepository } from "@/repositories/siteRepository";
import {
  isObjectRecord,
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from "@/repositories/storage";
import {
  SITE_TASK_STATUSES,
  type SiteTask,
  type SiteTaskStatus,
} from "@/types/site-task";

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isSiteTaskStatus = (value: unknown): value is SiteTaskStatus =>
  typeof value === "string" &&
  SITE_TASK_STATUSES.includes(value as SiteTaskStatus);

const normalizeTask = (value: unknown, siteId: string): SiteTask | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  return {
    id: typeof value.id === "string" ? value.id : createId(),
    siteId:
      typeof value.siteId === "string" && value.siteId ? value.siteId : siteId,
    title: typeof value.title === "string" ? value.title : "",
    description: typeof value.description === "string" ? value.description : "",
    status: isSiteTaskStatus(value.status) ? value.status : "할 일",
    dueDate: typeof value.dueDate === "string" ? value.dueDate : "",
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

const readTasks = (siteId: string): SiteTask[] => {
  const parsed = readStorageValue(getSiteTasksStorageKey(siteId));

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((entry) => normalizeTask(entry, siteId))
    .filter((entry): entry is SiteTask => entry !== null)
    .filter((entry) => entry.siteId === siteId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
};

const writeTasks = (siteId: string, tasks: SiteTask[]) => {
  writeStorageValue(getSiteTasksStorageKey(siteId), tasks);
};

export const taskRepository = {
  createDefault(siteId: string) {
    return createSiteTask(siteId);
  },

  getAll(): SiteTask[] {
    return siteRepository.getAll().flatMap((site) => readTasks(site.id));
  },

  getBySiteId(siteId: string): SiteTask[] {
    return readTasks(siteId);
  },

  getById(id: string): SiteTask | null {
    return this.getAll().find((task) => task.id === id) ?? null;
  },

  save(task: SiteTask): SiteTask {
    const tasks = readTasks(task.siteId);
    const index = tasks.findIndex((entry) => entry.id === task.id);
    const next = {
      ...task,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      tasks[index] = next;
    } else {
      tasks.unshift(next);
    }

    writeTasks(task.siteId, tasks);
    return next;
  },

  update(id: string, partial: Partial<SiteTask>): SiteTask | null {
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

    const tasks = readTasks(current.siteId).filter((task) => task.id !== id);
    writeTasks(current.siteId, tasks);
    return true;
  },

  deleteBySiteId(siteId: string) {
    removeStorageValue(getSiteTasksStorageKey(siteId));
  },
};
