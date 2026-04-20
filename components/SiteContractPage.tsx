"use client";

import { useEffect, useMemo, useState } from "react";
import SiteWorkspaceShell from "@/components/SiteWorkspaceShell";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { contractRepository } from "@/repositories/contractRepository";
import { customerRepository } from "@/repositories/customerRepository";
import { useSiteStore } from "@/store/site-store";
import { CONTRACT_STATUSES, type ContractStatus } from "@/types/contract";

type SiteContractPageProps = {
  siteId: string;
};

const contractStatusLabel: Record<ContractStatus, string> = {
  draft: "초안",
  signed: "계약 완료",
  in_progress: "진행 중",
  completed: "완료",
};

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

export default function SiteContractPage({ siteId }: SiteContractPageProps) {
  const site = useSiteStore((state) =>
    state.sites.find((entry) => entry.id === siteId)
  );
  const customer = useMemo(
    () => (site ? customerRepository.getSnapshotBySite(site) : null),
    [site]
  );
  const [loaded, setLoaded] = useState(false);
  const [contract, setContract] = useState(
    contractRepository.createDefault(siteId)
  );

  useEffect(() => {
    const savedContract = contractRepository.ensureInitialized(siteId);
    setContract(savedContract);
    setLoaded(true);
  }, [siteId]);

  const { hasUnsavedChanges, lastSavedAt, saveNow, saveStatus } = useAutoSave({
    value: contract,
    enabled: loaded,
    resetKey: `contract:${siteId}`,
    delay: 1000,
    getSavedAt: (value) => value.updatedAt,
    onSave: async (nextContract) => {
      const saved = contractRepository.save(nextContract);

      return {
        nextValue: saved,
        savedAt: new Date(saved.updatedAt).toLocaleString("ko-KR"),
      };
    },
    onAfterSave: (savedContract) => {
      setContract(savedContract);
    },
  });

  useUnsavedChangesGuard({ enabled: hasUnsavedChanges });

  const updateContract = <K extends keyof typeof contract>(
    key: K,
    value: (typeof contract)[K]
  ) => {
    setContract((current) => ({
      ...current,
      [key]: value,
    }));
  };

  if (!site || !customer) {
    return <div className="p-8">존재하지 않거나 삭제된 현장입니다.</div>;
  }

  if (!loaded) {
    return <div className="p-8">계약 정보를 불러오는 중입니다.</div>;
  }

  return (
    <SiteWorkspaceShell
      site={site}
      activeSection="contract"
      currentLabel="계약"
      activeLink="contract"
      title="현장 계약"
      description="현장별 계약 상태와 금액, 메모를 repository 흐름으로 관리합니다."
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
      onSave={() => {
        void saveNow();
      }}
    >
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            고객 / 현장 요약
          </h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-slate-500">고객명</div>
              <div className="mt-1 font-medium text-slate-900">
                {customer.name || "미지정 고객"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-slate-500">연락처</div>
              <div className="mt-1 font-medium text-slate-900">
                {customer.phone || "연락처 없음"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-slate-500">이메일</div>
              <div className="mt-1 font-medium text-slate-900">
                {customer.email || "이메일 없음"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-slate-500">현장명</div>
              <div className="mt-1 font-medium text-slate-900">
                {site.siteName}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              <span className="mb-2 block font-medium">계약 상태</span>
              <select
                className={inputClassName}
                value={contract.status}
                onChange={(event) =>
                  updateContract("status", event.target.value as ContractStatus)
                }
              >
                {CONTRACT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {contractStatusLabel[status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-2 block font-medium">계약일</span>
              <input
                type="date"
                className={inputClassName}
                value={contract.signedAt ?? ""}
                onChange={(event) =>
                  updateContract("signedAt", event.target.value || null)
                }
              />
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              <span className="mb-2 block font-medium">계약 금액</span>
              <input
                type="number"
                min="0"
                className={inputClassName}
                value={contract.totalAmount ?? ""}
                onChange={(event) =>
                  updateContract(
                    "totalAmount",
                    event.target.value === ""
                      ? null
                      : Number(event.target.value)
                  )
                }
                placeholder="견적 합계를 기본값으로 반영합니다"
              />
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="font-medium text-slate-900">초기 반영 기준</div>
              <div className="mt-2 leading-6">
                {contract.totalAmount === null
                  ? "연결된 견적이 없어 계약 금액이 비어 있습니다."
                  : "최초 진입 시 견적 합계를 기본값으로 반영했고, 이후에는 수동 수정값을 유지합니다."}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div>상태 요약: {contractStatusLabel[contract.status]}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div>최근 수정: {lastSavedAt ?? "-"}</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-sm text-slate-500">계약 예정 금액</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {contract.totalAmount == null
                ? "견적 합계 없음"
                : `${contract.totalAmount.toLocaleString()}원`}
            </div>
          </div>

          <label className="mt-5 block text-sm text-slate-700">
            <span className="mb-2 block font-medium">계약 메모</span>
            <textarea
              className="min-h-[280px] w-full rounded-xl border border-slate-200 p-4 leading-7"
              value={contract.note}
              onChange={(event) => updateContract("note", event.target.value)}
              placeholder="계약 진행 메모, 특약사항, 일정 관련 내용을 기록합니다."
            />
          </label>
        </section>
      </div>
    </SiteWorkspaceShell>
  );
}
