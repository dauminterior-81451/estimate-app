"use client";

import Link from "next/link";
import { useMemo } from "react";
import WorkspaceTopBar from "@/components/WorkspaceTopBar";
import {
  DASHBOARD_CONTRACT_STATUSES,
  getDashboardSummary,
} from "@/lib/dashboard";
import { useSiteStore } from "@/store/site-store";

const contractStatusLabels = {
  draft: "초안",
  signed: "계약 완료",
  in_progress: "진행 중",
  completed: "완료",
} as const;

export default function DashboardPage() {
  const sites = useSiteStore((state) => state.sites);
  const summary = useMemo(() => getDashboardSummary(sites), [sites]);

  return (
    <div className="min-h-screen bg-[#f5f6f8] p-8">
      <div className="mx-auto max-w-7xl">
        <WorkspaceTopBar currentLabel="대시보드" activeLink="dashboard" />

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">대시보드</h1>
            <p className="mt-2 text-sm text-slate-500">
              전체 현장 상태와 최근 수정 현황을 한눈에 확인하는 요약 화면입니다.
            </p>
          </div>
          <Link
            href="/sites"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            현장목록 보기
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">전체 현장 수</div>
            <div className="mt-3 text-3xl font-bold text-slate-900">
              {summary.totalSites}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">진행 중 현장</div>
            <div className="mt-3 text-3xl font-bold text-slate-900">
              {summary.inProgressSites}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">완료 현장</div>
            <div className="mt-3 text-3xl font-bold text-slate-900">
              {summary.completedSites}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">계약 상태별 현장 수</h2>
            <p className="mt-1 text-sm text-slate-500">
              계약 상태 집계를 기준으로 현재 운영 현황을 확인합니다.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {DASHBOARD_CONTRACT_STATUSES.map((status) => (
              <div
                key={status}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="text-sm text-slate-500">
                  {contractStatusLabels[status]}
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {summary.contractCounts[status]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">최근 수정된 현장</h2>
            <p className="mt-1 text-sm text-slate-500">
              현장 이름과 함께 연결된 고객명을 repository 기준으로 표시합니다.
            </p>
          </div>

          {summary.recentSites.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              아직 등록된 현장이 없습니다. 현장을 추가하면 최근 현장 리스트가
              표시됩니다.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                <div>현장명</div>
                <div>고객명</div>
                <div>상태</div>
                <div>계약</div>
                <div>최근 수정</div>
              </div>

              {summary.recentSites.map((site) => (
                <Link
                  key={site.id}
                  href={`/sites/${site.id}`}
                  className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr] border-t border-slate-200 px-4 py-4 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <div className="font-medium text-slate-900">{site.siteName}</div>
                  <div>{site.customerName || "미지정 고객"}</div>
                  <div>{site.siteStatus}</div>
                  <div>{contractStatusLabels[site.contractStatus]}</div>
                  <div>{site.lastUpdatedAt}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
