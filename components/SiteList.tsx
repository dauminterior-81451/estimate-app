"use client";

import Link from "next/link";
import { useMemo } from "react";
import WorkspaceTopBar from "@/components/WorkspaceTopBar";
import { customerRepository } from "@/repositories/customerRepository";
import { useSiteStore } from "@/store/site-store";

export default function SiteList() {
  const sites = useSiteStore((state) => state.sites);

  const rows = useMemo(
    () =>
      sites.map((site) => {
        const customer = customerRepository.getSnapshotBySite(site);

        return {
          id: site.id,
          siteName: site.siteName || "현장명 없음",
          customerName: customer.name || "미지정 고객",
          phone: customer.phone || "연락처 없음",
          email: customer.email || "이메일 없음",
          createdAt: site.createdAt,
          status: site.status,
        };
      }),
    [sites]
  );

  return (
    <div className="min-h-screen bg-[#f5f6f8] p-8">
      <div className="mx-auto max-w-7xl">
        <WorkspaceTopBar currentLabel="현장 목록" activeLink="sites" />

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Estimate Admin</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">현장 목록</h1>
            </div>
            <Link
              href="/sites/new"
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
            >
              + 새 현장 추가
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[1.1fr_1fr_1fr_1.1fr_0.8fr_0.7fr] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              <div>고객명</div>
              <div>연락처</div>
              <div>이메일</div>
              <div>현장명</div>
              <div>생성일</div>
              <div>상태</div>
            </div>

            {rows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                등록된 현장이 없습니다.
              </div>
            ) : null}

            {rows.map((site) => (
              <Link
                key={site.id}
                href={`/sites/${site.id}`}
                className="grid grid-cols-[1.1fr_1fr_1fr_1.1fr_0.8fr_0.7fr] border-t border-slate-200 px-4 py-4 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <div className="font-medium text-slate-900">{site.customerName}</div>
                <div>{site.phone}</div>
                <div className="truncate">{site.email}</div>
                <div>{site.siteName}</div>
                <div>{site.createdAt}</div>
                <div>{site.status}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
