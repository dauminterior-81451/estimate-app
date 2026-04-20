"use client";

import { contractRepository } from "@/repositories/contractRepository";
import { customerRepository } from "@/repositories/customerRepository";
import { estimateRepository } from "@/repositories/estimateRepository";
import { fileRepository } from "@/repositories/fileRepository";
import { noteRepository } from "@/repositories/noteRepository";
import { taskRepository } from "@/repositories/taskRepository";
import type { Site } from "@/types/site";

export const DASHBOARD_CONTRACT_STATUSES = [
  "draft",
  "signed",
  "in_progress",
  "completed",
] as const;

export type DashboardContractStatus =
  (typeof DASHBOARD_CONTRACT_STATUSES)[number];

export type DashboardSiteSummary = {
  id: string;
  siteName: string;
  customerName: string;
  siteStatus: string;
  contractStatus: DashboardContractStatus;
  lastUpdatedAt: string;
};

export type DashboardSummary = {
  totalSites: number;
  inProgressSites: number;
  completedSites: number;
  contractCounts: Record<DashboardContractStatus, number>;
  recentSites: DashboardSiteSummary[];
};

const toTimestamp = (value: string | null | undefined) => {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatTimestamp = (value: string) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("ko-KR");
};

const deriveProgressStatus = (
  siteStatus: string,
  contractStatus: DashboardContractStatus
) => {
  if (contractStatus === "completed") {
    return "completed";
  }

  if (contractStatus === "signed" || contractStatus === "in_progress") {
    return "in_progress";
  }

  return siteStatus === "발송완료" ? "completed" : "in_progress";
};

export const getDashboardSummary = (sites: Site[]): DashboardSummary => {
  const contractCounts: Record<DashboardContractStatus, number> = {
    draft: 0,
    signed: 0,
    in_progress: 0,
    completed: 0,
  };

  let inProgressSites = 0;
  let completedSites = 0;

  const recentSites = sites
    .map((site) => {
      const estimate = estimateRepository.getBySiteId(site.id);
      const latestNote = noteRepository.getBySiteId(site.id)[0] ?? null;
      const latestFile = fileRepository.getBySiteId(site.id)[0] ?? null;
      const latestTask = taskRepository.getBySiteId(site.id)[0] ?? null;
      const contract =
        contractRepository.getBySiteId(site.id) ??
        contractRepository.createDefault(site.id);
      const customer = customerRepository.getSnapshotBySite(site);

      contractCounts[contract.status] += 1;

      const progress = deriveProgressStatus(site.status, contract.status);

      if (progress === "completed") {
        completedSites += 1;
      } else {
        inProgressSites += 1;
      }

      const timestamps = [
        site.updatedAt,
        site.createdAt,
        estimate?.updatedAt ?? null,
        latestNote?.updatedAt ?? null,
        latestFile?.updatedAt ?? null,
        latestTask?.updatedAt ?? null,
        contract.updatedAt,
      ];

      const lastUpdatedAt =
        timestamps
          .filter((value): value is string => Boolean(value))
          .sort((a, b) => toTimestamp(b) - toTimestamp(a))[0] ?? site.createdAt;

      return {
        id: site.id,
        siteName: site.siteName,
        customerName: customer.name || site.customerName,
        siteStatus: site.status,
        contractStatus: contract.status,
        lastUpdatedAt,
      };
    })
    .sort((a, b) => toTimestamp(b.lastUpdatedAt) - toTimestamp(a.lastUpdatedAt))
    .slice(0, 10)
    .map((site) => ({
      ...site,
      lastUpdatedAt: formatTimestamp(site.lastUpdatedAt),
    }));

  return {
    totalSites: sites.length,
    inProgressSites,
    completedSites,
    contractCounts,
    recentSites,
  };
};
