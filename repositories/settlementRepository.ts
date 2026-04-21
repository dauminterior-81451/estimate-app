"use client";

import {
  isObjectRecord,
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from "@/repositories/storage";
import { contractRepository } from "@/repositories/contractRepository";

export type PaymentStage = "deposit" | "interim" | "balance";

export type PaymentRecord = {
  id: string;
  siteId: string;
  stage: PaymentStage;
  amount: number;
  paidAt: string;
  note: string;
};

export type Settlement = {
  siteId: string;
  depositRate: number;
  interimRate: number;
  balanceRate: number;
  payments: PaymentRecord[];
  updatedAt: string;
};

const STAGE_LABELS: Record<PaymentStage, string> = {
  deposit: "계약금",
  interim: "중도금",
  balance: "잔금",
};

export { STAGE_LABELS };

const getKey = (siteId: string) => `site:${siteId}:settlement`;

const normalizePayment = (v: unknown, siteId: string): PaymentRecord | null => {
  if (!isObjectRecord(v)) return null;
  const stages: PaymentStage[] = ["deposit", "interim", "balance"];
  return {
    id: typeof v.id === "string" ? v.id : crypto.randomUUID(),
    siteId,
    stage: stages.includes(v.stage as PaymentStage)
      ? (v.stage as PaymentStage)
      : "deposit",
    amount: typeof v.amount === "number" ? v.amount : 0,
    paidAt: typeof v.paidAt === "string" ? v.paidAt : new Date().toISOString(),
    note: typeof v.note === "string" ? v.note : "",
  };
};

const normalizeSettlement = (value: unknown, siteId: string): Settlement => {
  const fallback: Settlement = {
    siteId,
    depositRate: 30,
    interimRate: 40,
    balanceRate: 30,
    payments: [],
    updatedAt: new Date().toISOString(),
  };

  if (!isObjectRecord(value)) return fallback;

  const payments = Array.isArray(value.payments)
    ? value.payments
        .map((p) => normalizePayment(p, siteId))
        .filter((p): p is PaymentRecord => p !== null)
    : [];

  return {
    siteId,
    depositRate:
      typeof value.depositRate === "number" ? value.depositRate : 30,
    interimRate:
      typeof value.interimRate === "number" ? value.interimRate : 40,
    balanceRate:
      typeof value.balanceRate === "number" ? value.balanceRate : 30,
    payments,
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString(),
  };
};

export const settlementRepository = {
  get(siteId: string): Settlement {
    const parsed = readStorageValue(getKey(siteId));
    return normalizeSettlement(parsed, siteId);
  },

  save(settlement: Settlement): Settlement {
    const next = { ...settlement, updatedAt: new Date().toISOString() };
    writeStorageValue(getKey(settlement.siteId), next);
    return next;
  },

  addPayment(
    siteId: string,
    stage: PaymentStage,
    amount: number,
    paidAt: string,
    note: string
  ): Settlement {
    const current = this.get(siteId);
    const newPayment: PaymentRecord = {
      id: crypto.randomUUID(),
      siteId,
      stage,
      amount,
      paidAt,
      note,
    };
    return this.save({ ...current, payments: [...current.payments, newPayment] });
  },

  deletePayment(siteId: string, paymentId: string): Settlement {
    const current = this.get(siteId);
    return this.save({
      ...current,
      payments: current.payments.filter((p) => p.id !== paymentId),
    });
  },

  getTotalAmount(siteId: string): number | null {
    const contract = contractRepository.getBySiteId(siteId);
    return contract?.totalAmount ?? null;
  },
};
