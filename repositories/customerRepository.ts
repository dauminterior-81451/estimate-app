"use client";

import { siteRepository } from "@/repositories/siteRepository";
import {
  isObjectRecord,
  readStorageValue,
  writeStorageValue,
} from "@/repositories/storage";
import type { Customer } from "@/types/customer";
import type { Site } from "@/types/site";

const CUSTOMERS_STORAGE_KEY = "customers";

export type CustomerSnapshot = {
  id: string | null;
  name: string;
  phone: string;
  email: string;
  memo: string;
};

export type CustomerOption = {
  value: string;
  label: string;
  description: string;
};

export type CustomerDeleteCheck = {
  canDelete: boolean;
  linkedSites: Site[];
};

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createTimestamp = () => new Date().toISOString();

const normalizeCustomer = (value: unknown): Customer | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const now = createTimestamp();

  return {
    id: typeof value.id === "string" && value.id ? value.id : createId(),
    name: typeof value.name === "string" ? value.name : "",
    phone: typeof value.phone === "string" ? value.phone : "",
    email: typeof value.email === "string" ? value.email : "",
    memo: typeof value.memo === "string" ? value.memo : "",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
  };
};

const readCustomers = (): Customer[] => {
  const parsed = readStorageValue(CUSTOMERS_STORAGE_KEY);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((entry) => normalizeCustomer(entry))
    .filter((entry): entry is Customer => entry !== null)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
};

const writeCustomers = (customers: Customer[]) => {
  writeStorageValue(CUSTOMERS_STORAGE_KEY, customers);
};

const toSnapshot = (
  customer: Customer | null,
  site?: Site
): CustomerSnapshot => ({
  id: customer?.id ?? site?.customerId ?? null,
  name: customer?.name ?? site?.customerName ?? "",
  phone: customer?.phone ?? site?.phone ?? "",
  email: customer?.email ?? site?.email ?? "",
  memo: customer?.memo ?? "",
});

const syncLinkedSites = (customer: Customer) => {
  siteRepository
    .getAll()
    .filter((site) => site.customerId === customer.id)
    .forEach((site) => {
      siteRepository.update(site.id, {
        customerName: customer.name,
        phone: customer.phone,
        email: customer.email,
      });
    });
};

export const customerRepository = {
  createDefault(overrides: Partial<Customer> = {}): Customer {
    const now = createTimestamp();

    return {
      id: createId(),
      name: "",
      phone: "",
      email: "",
      memo: "",
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  },

  getAll(): Customer[] {
    return readCustomers();
  },

  getById(id: string): Customer | null {
    return readCustomers().find((customer) => customer.id === id) ?? null;
  },

  getOptions(): CustomerOption[] {
    return this.getAll().map((customer) => ({
      value: customer.id,
      label: customer.name || "이름 없는 고객",
      description: customer.phone || customer.email || "연락처 정보 없음",
    }));
  },

  getLinkedSites(customerId: string): Site[] {
    return siteRepository
      .getAll()
      .filter((site) => site.customerId === customerId);
  },

  getDeleteCheck(customerId: string): CustomerDeleteCheck {
    const linkedSites = this.getLinkedSites(customerId);

    return {
      canDelete: linkedSites.length === 0,
      linkedSites,
    };
  },

  getSnapshotBySite(site: Site): CustomerSnapshot {
    const linkedCustomer =
      site.customerId ? this.getById(site.customerId) : null;

    return toSnapshot(linkedCustomer, site);
  },

  save(customer: Customer): Customer {
    const customers = readCustomers();
    const index = customers.findIndex((entry) => entry.id === customer.id);
    const next = {
      ...customer,
      updatedAt: createTimestamp(),
    };

    if (index >= 0) {
      customers[index] = next;
    } else {
      customers.unshift(next);
    }

    writeCustomers(customers);
    syncLinkedSites(next);
    return next;
  },

  update(id: string, partial: Partial<Customer>): Customer | null {
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
    const { canDelete } = this.getDeleteCheck(id);

    if (!canDelete) {
      return false;
    }

    const customers = readCustomers();
    const nextCustomers = customers.filter((customer) => customer.id !== id);

    if (nextCustomers.length === customers.length) {
      return false;
    }

    writeCustomers(nextCustomers);
    return true;
  },
};
