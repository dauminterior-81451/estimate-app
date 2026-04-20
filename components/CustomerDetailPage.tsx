"use client";

import Link from "next/link";
import { useMemo } from "react";
import WorkspaceTopBar from "@/components/WorkspaceTopBar";
import { customerRepository } from "@/repositories/customerRepository";

type CustomerDetailPageProps = {
  customerId: string;
};

export default function CustomerDetailPage({
  customerId,
}: CustomerDetailPageProps) {
  const customer = useMemo(
    () => customerRepository.getById(customerId),
    [customerId]
  );
  const linkedSites = useMemo(
    () => customerRepository.getLinkedSites(customerId),
    [customerId]
  );

  if (!customer) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <WorkspaceTopBar currentLabel="고객 상세" activeLink="customers" />

          <section className="rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Customer Detail
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              고객 정보를 찾을 수 없습니다
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              삭제되었거나 존재하지 않는 고객입니다. 목록으로 돌아가서 다시
              확인하세요.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/customers"
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                고객 목록으로 이동
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff4ff_0%,#f8fafc_22%,#f8fafc_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <WorkspaceTopBar currentLabel="고객 상세" activeLink="customers" />

        <section className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Customer Profile
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {customer.name || "미지정 고객"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                고객 기본 정보와 연결된 현장을 확인하는 상세 화면입니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/sites/new?customerId=${customer.id}`}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                현장 추가
              </Link>
              <Link
                href="/customers"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                고객 목록
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-sm text-slate-500">이름</p>
              <p className="mt-3 text-xl font-bold text-slate-900">
                {customer.name || "미지정 고객"}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-sm text-slate-500">연락처</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                {customer.phone || "연락처 없음"}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-sm text-slate-500">이메일</p>
              <p className="mt-3 truncate text-lg font-semibold text-slate-900">
                {customer.email || "이메일 없음"}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-sm text-slate-500">최근 수정일</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                {new Date(customer.updatedAt).toLocaleString("ko-KR")}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_340px]">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-xl font-semibold text-slate-900">연결된 현장</h2>
              <p className="mt-1 text-sm text-slate-500">
                이 고객과 연결된 현장 목록입니다. 현장을 선택하면 상세 화면으로
                이동합니다.
              </p>
            </div>

            {linkedSites.length === 0 ? (
              <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-[radial-gradient(circle_at_top,#f8fafc,#f1f5f9)] px-6 py-12 text-center">
                <div className="rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Empty State
                </div>
                <h3 className="mt-5 text-2xl font-bold text-slate-900">
                  연결된 현장이 없습니다
                </h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                  아직 이 고객과 연결된 현장이 없습니다. 현장 생성 또는 수정
                  화면에서 고객을 선택하면 여기에 표시됩니다.
                </p>
                <Link
                  href="/sites"
                  className="mt-6 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  현장 목록 보기
                </Link>
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                <div className="grid grid-cols-[1.5fr_0.9fr_1fr_0.8fr] bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-600">
                  <div>현장명</div>
                  <div>상태</div>
                  <div>생성일</div>
                  <div className="text-right">이동</div>
                </div>

                {linkedSites.map((site) => (
                  <Link
                    key={site.id}
                    href={`/sites/${site.id}`}
                    className="grid grid-cols-[1.5fr_0.9fr_1fr_0.8fr] items-center border-t border-slate-200 px-5 py-4 text-sm text-slate-700 transition hover:bg-slate-50/80"
                  >
                    <div className="font-medium text-slate-900">
                      {site.siteName || "현장명 없음"}
                    </div>
                    <div>{site.status}</div>
                    <div>{site.createdAt}</div>
                    <div className="text-right text-slate-500">상세 보기</div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">기본 정보</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-slate-500">고객명</div>
                  <div className="mt-1 font-medium text-slate-900">
                    {customer.name || "미지정 고객"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-slate-500">연락처</div>
                  <div className="mt-1 font-medium text-slate-900">
                    {customer.phone || "연락처 없음"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-slate-500">이메일</div>
                  <div className="mt-1 break-all font-medium text-slate-900">
                    {customer.email || "이메일 없음"}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">메모</h2>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                {customer.memo || "등록된 메모가 없습니다."}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
