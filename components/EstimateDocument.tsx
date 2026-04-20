"use client";

import { Fragment, useMemo } from "react";
import { calcCategory, calcItem, calcTotal } from "@/lib/calc";
import { customerRepository } from "@/repositories/customerRepository";
import type { EstimateDraft } from "@/types/estimate";
import type { Site } from "@/types/site";

type EstimateDocumentProps = {
  draft: EstimateDraft;
  site: Site;
};

export default function EstimateDocument({
  draft,
  site,
}: EstimateDocumentProps) {
  const totals = calcTotal(draft.categories, draft.vat);
  const customer = useMemo(
    () => customerRepository.getSnapshotBySite(site),
    [site]
  );

  const customerName = customer.name || "미등록 고객";
  const customerPhone = customer.phone || "연락처 없음";
  const customerEmail = customer.email || "이메일 없음";

  return (
    <article className="print-document mx-auto w-full max-w-[960px] bg-white text-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.08)] print:max-w-none print:shadow-none">
      <div className="border-b border-slate-200 px-8 py-8 print:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Estimate
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {draft.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              고객에게 전달하는 견적 문서입니다. 현장과 연결된 고객 정보,
              견적 항목, 총액을 문서 형식으로 정리해 출력할 수 있습니다.
            </p>
          </div>

          <div className="print-avoid-break grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
            <div className="flex justify-between gap-8">
              <span>견적일</span>
              <span className="font-medium text-slate-900">
                {draft.estimateDate || "-"}
              </span>
            </div>
            <div className="flex justify-between gap-8">
              <span>최종 수정</span>
              <span className="font-medium text-slate-900">
                {draft.updatedAt || "-"}
              </span>
            </div>
            <div className="flex justify-between gap-8">
              <span>부가세</span>
              <span className="font-medium text-slate-900">
                {draft.vat ? "포함" : "별도"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 border-b border-slate-200 px-8 py-8 md:grid-cols-2 print:px-10">
        <section className="print-avoid-break rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#fcfcfd_0%,#f8fafc_100%)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                고객 정보
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                현장의 <code>customerId</code>를 기준으로 고객 마스터에서 자동
                반영된 정보입니다.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500">
              Customer
            </div>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">이름</dt>
              <dd className="font-medium text-slate-900">{customerName}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">연락처</dt>
              <dd className="font-medium text-slate-900">{customerPhone}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">이메일</dt>
              <dd className="font-medium text-slate-900">{customerEmail}</dd>
            </div>
          </dl>
        </section>

        <section className="print-avoid-break rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            현장 정보
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">현장명</dt>
              <dd className="font-medium text-slate-900">
                {site.siteName || "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">현장 ID</dt>
              <dd className="font-medium text-slate-900">{site.id}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">등록일</dt>
              <dd className="font-medium text-slate-900">
                {site.createdAt || "-"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="px-8 py-8 print:px-10">
        <section className="print-avoid-break">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">견적 내역</h2>
              <p className="mt-1 text-sm text-slate-500">
                항목별 수량과 단가, 금액을 문서 형태로 정리했습니다.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-5 py-4 font-semibold">구분</th>
                  <th className="px-5 py-4 font-semibold">항목</th>
                  <th className="px-5 py-4 text-right font-semibold">수량</th>
                  <th className="px-5 py-4 text-right font-semibold">단가</th>
                  <th className="px-5 py-4 text-right font-semibold">금액</th>
                </tr>
              </thead>
              <tbody>
                {draft.categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-slate-400"
                    >
                      등록된 항목이 없습니다.
                    </td>
                  </tr>
                ) : (
                  draft.categories.map((category) => (
                    <Fragment key={category.id}>
                      {category.items.length === 0 ? (
                        <tr className="border-t border-slate-200">
                          <td className="px-5 py-4 font-medium text-slate-900">
                            {category.name}
                          </td>
                          <td colSpan={4} className="px-5 py-4 text-slate-400">
                            등록된 세부 항목이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        category.items.map((item, itemIndex) => (
                          <tr
                            key={item.id}
                            className="border-t border-slate-200 align-top"
                          >
                            <td className="px-5 py-4 font-medium text-slate-900">
                              {itemIndex === 0 ? category.name : ""}
                            </td>
                            <td className="px-5 py-4 text-slate-700">
                              {item.name || "항목명 없음"}
                            </td>
                            <td className="px-5 py-4 text-right text-slate-700">
                              {item.qty.toLocaleString()}
                            </td>
                            <td className="px-5 py-4 text-right text-slate-700">
                              {item.price.toLocaleString()}원
                            </td>
                            <td className="px-5 py-4 text-right font-medium text-slate-900">
                              {calcItem(item.qty, item.price).toLocaleString()}원
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td
                          colSpan={4}
                          className="px-5 py-4 text-right font-medium text-slate-600"
                        >
                          항목 소계
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-950">
                          {calcCategory(category.items).toLocaleString()}원
                        </td>
                      </tr>
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
          <section className="print-avoid-break rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              비고
            </h2>
            <div className="mt-4 min-h-24 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {draft.note || "별도 비고가 없습니다."}
            </div>
          </section>

          <section className="print-avoid-break rounded-2xl border border-slate-900 bg-slate-900 p-5 text-white">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              총액 요약
            </h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-300">
                <span>공급가액</span>
                <span>{totals.supply.toLocaleString()}원</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>부가세</span>
                <span>{totals.vatAmount.toLocaleString()}원</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-700 pt-4 text-lg font-semibold text-white">
                <span>합계</span>
                <span>{totals.total.toLocaleString()}원</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
