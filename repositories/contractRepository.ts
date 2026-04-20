"use client";

import { calcTotal } from "@/lib/calc";
import { getSiteContractStorageKey } from "@/lib/site-storage";
import { estimateRepository } from "@/repositories/estimateRepository";
import {
  CONTRACT_STATUSES,
  type Contract,
  type ContractStatus,
} from "@/types/contract";
import { siteRepository } from "@/repositories/siteRepository";
import {
  isObjectRecord,
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from "@/repositories/storage";

const isContractStatus = (value: unknown): value is ContractStatus =>
  typeof value === "string" &&
  CONTRACT_STATUSES.includes(value as ContractStatus);

const getEstimateTotalAmount = (siteId: string): number | null => {
  const estimate = estimateRepository.getBySiteId(siteId);

  if (!estimate) {
    return null;
  }

  return calcTotal(estimate.categories, estimate.vat).total;
};

const createDefaultContract = (
  siteId: string,
  totalAmount = getEstimateTotalAmount(siteId)
): Contract => ({
  id: siteId,
  siteId,
  status: "draft",
  totalAmount,
  note: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  signedAt: null,
});

const normalizeContract = (value: unknown, siteId: string): Contract | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  return {
    id: typeof value.id === "string" ? value.id : siteId,
    siteId:
      typeof value.siteId === "string" && value.siteId ? value.siteId : siteId,
    status: isContractStatus(value.status) ? value.status : "draft",
    totalAmount:
      typeof value.totalAmount === "number" || value.totalAmount === null
        ? value.totalAmount
        : undefined,
    note: typeof value.note === "string" ? value.note : "",
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString(),
    signedAt:
      typeof value.signedAt === "string" || value.signedAt === null
        ? (value.signedAt as string | null)
        : null,
  };
};

const readContract = (siteId: string): Contract | null => {
  const parsed = readStorageValue(getSiteContractStorageKey(siteId));
  return normalizeContract(parsed, siteId);
};

export const contractRepository = {
  createDefault(siteId: string) {
    return createDefaultContract(siteId);
  },

  ensureInitialized(siteId: string): Contract {
    const current = readContract(siteId);

    if (!current) {
      const created = createDefaultContract(siteId);
      writeStorageValue(getSiteContractStorageKey(siteId), created);
      return created;
    }

    if (typeof current.totalAmount === "undefined") {
      return this.save({
        ...current,
        totalAmount: getEstimateTotalAmount(siteId),
      });
    }

    return current;
  },

  getAll(): Contract[] {
    return siteRepository
      .getAll()
      .map((site) => this.ensureInitialized(site.id))
      .filter((entry): entry is Contract => entry !== null);
  },

  getBySiteId(siteId: string): Contract | null {
    return readContract(siteId);
  },

  getById(id: string): Contract | null {
    return this.getBySiteId(id);
  },

  save(contract: Contract): Contract {
    const next = {
      ...contract,
      updatedAt: new Date().toISOString(),
    };

    writeStorageValue(getSiteContractStorageKey(contract.siteId), next);
    return next;
  },

  update(id: string, partial: Partial<Contract>): Contract | null {
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
    const exists = this.getById(id) !== null;
    removeStorageValue(getSiteContractStorageKey(id));
    return exists;
  },
};
