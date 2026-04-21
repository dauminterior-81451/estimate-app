"use client";

import { useState, useMemo } from "react";
import SiteWorkspaceShell from "@/components/SiteWorkspaceShell";
import { siteRepository } from "@/repositories/siteRepository";
import {
  settlementRepository,
  STAGE_LABELS,
  type PaymentStage,
  type Settlement,
} from "@/repositories/settlementRepository";

const STAGES: PaymentStage[] = ["deposit", "interim", "balance"];

const formatKRW = (n: number) => n.toLocaleString("ko-KR") + "원";

const formatDate = (iso: string) => iso.slice(0, 10);

type FormState = {
  stage: PaymentStage;
  amount: string;
  paidAt: string;
  note: string;
};

const defaultForm = (): FormState => ({
  stage: "deposit",
  amount: "",
  paidAt: new Date().toISOString().slice(0, 10),
  note: "",
});

export default function SiteSettlementPage({ siteId }: { siteId: string }) {
  const site = siteRepository.getById(siteId);
  const [settlement, setSettlement] = useState<Settlement>(() =>
    settlementRepository.get(siteId)
  );
  const [form, setForm] = useState<FormState>(defaultForm);
  const [showForm, setShowForm] = useState(false);

  const totalAmount = settlementRepository.getTotalAmount(siteId);

  const paidByStage = useMemo(() => {
    const map: Record<PaymentStage, number> = {
      deposit: 0,
      interim: 0,
      balance: 0,
    };
    for (const p of settlement.payments) {
      map[p.stage] += p.amount;
    }
    return map;
  }, [settlement.payments]);

  const totalPaid = Object.values(paidByStage).reduce((a, b) => a + b, 0);
  const remaining = totalAmount != null ? totalAmount - totalPaid : null;

  const plannedByStage = useMemo(() => {
    if (totalAmount == null) return null;
    return {
      deposit: Math.round((totalAmount * settlement.depositRate) / 100),
      interim: Math.round((totalAmount * settlement.interimRate) / 100),
      balance: Math.round((totalAmount * settlement.balanceRate) / 100),
    };
  }, [totalAmount, settlement.depositRate, settlement.interimRate, settlement.balanceRate]);

  if (!site) return null;

  const handleAdd = () => {
    const amount = Number(form.amount.replace(/,/g, ""));
    if (!amount || !form.paidAt) return;
    const updated = settlementRepository.addPayment(
      siteId,
      form.stage,
      amount,
      form.paidAt,
      form.note
    );
    setSettlement(updated);
    setForm(defaultForm());
    setShowForm(false);
  };

  const handleDelete = (paymentId: string) => {
    const updated = settlementRepository.deletePayment(siteId, paymentId);
    setSettlement(updated);
  };

  return (
    <SiteWorkspaceShell
      site={site}
      activeSection="settlement"
      currentLabel="입금 / 정산"
      activeLink="contract"
      title="입금 / 정산"
      description="계약금·중도금·잔금 수금 현황을 관리합니다."
    >
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "총 계약금액",
            value: totalAmount != null ? formatKRW(totalAmount) : "-",
          },
          { label: "총 수금액", value: formatKRW(totalPaid) },
          {
            label: "잔여금액",
            value: remaining != null ? formatKRW(remaining) : "-",
          },
          {
            label: "수금률",
            value: totalAmount
              ? Math.round((totalPaid / totalAmount) * 100) + "%"
              : "-",
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* 단계별 현황 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">
          단계별 수금 현황
        </h2>
        <div className="space-y-3">
          {STAGES.map((stage) => {
            const planned = plannedByStage?.[stage];
            const paid = paidByStage[stage];
            const pct = planned
              ? Math.min(100, Math.round((paid / planned) * 100))
              : 0;
            return (
              <div key={stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    {STAGE_LABELS[stage]}
                  </span>
                  <span className="text-slate-500">
                    {formatKRW(paid)}
                    {planned != null ? ` / ${formatKRW(planned)}` : ""}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-slate-800 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 수금 내역 */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-700">수금 내역</h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"
          >
            + 수금 등록
          </button>
        </div>

        {showForm && (
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <select
                value={form.stage}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    stage: e.target.value as PaymentStage,
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="금액"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={form.paidAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paidAt: e.target.value }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="메모 (선택)"
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAdd}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setForm(defaultForm());
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {settlement.payments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            등록된 수금 내역이 없습니다.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">구분</th>
                <th className="px-5 py-3 font-medium">금액</th>
                <th className="px-5 py-3 font-medium">수금일</th>
                <th className="px-5 py-3 font-medium">메모</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {settlement.payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {STAGE_LABELS[p.stage]}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {formatKRW(p.amount)}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {formatDate(p.paidAt)}
                  </td>
                  <td className="px-5 py-3 text-slate-400">{p.note || "-"}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SiteWorkspaceShell>
  );
}
