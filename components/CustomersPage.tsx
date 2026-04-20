"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WorkspaceTopBar from "@/components/WorkspaceTopBar";
import CustomerForm, {
  createEmptyCustomerForm,
  type CustomerFormValues,
} from "@/components/customer/CustomerForm";
import { customerRepository } from "@/repositories/customerRepository";
import { useSiteStore } from "@/store/site-store";
import type { Customer } from "@/types/customer";

const toFormValues = (customer: Customer): CustomerFormValues => ({
  name: customer.name,
  phone: customer.phone,
  email: customer.email,
  memo: customer.memo,
});

const normalizeKeyword = (value: string) => value.trim().toLowerCase();

export default function CustomersPage() {
  const refreshSites = useSiteStore((state) => state.refreshSites);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [form, setForm] = useState<CustomerFormValues>(createEmptyCustomerForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCustomers = () => {
    setCustomers(customerRepository.getAll());
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const resetForm = () => {
    setEditingCustomerId(null);
    setForm(createEmptyCustomerForm());
    setIsSubmitting(false);
  };

  const handleEditClick = (customerId: string) => {
    const customer = customerRepository.getById(customerId);

    if (!customer) {
      window.alert("고객 정보를 찾을 수 없습니다.");
      loadCustomers();
      return;
    }

    setEditingCustomerId(customer.id);
    setForm(toFormValues(customer));
  };

  const handleFieldChange = <K extends keyof CustomerFormValues>(
    key: K,
    value: CustomerFormValues[K]
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = () => {
    const nextName = form.name.trim();

    if (!nextName) {
      window.alert("고객명은 필수입니다.");
      return;
    }

    setIsSubmitting(true);

    if (editingCustomerId) {
      const updated = customerRepository.update(editingCustomerId, {
        name: nextName,
        phone: form.phone.trim(),
        email: form.email.trim(),
        memo: form.memo.trim(),
      });

      if (!updated) {
        window.alert("수정할 고객을 찾을 수 없습니다.");
        setIsSubmitting(false);
        loadCustomers();
        return;
      }
    } else {
      customerRepository.save(
        customerRepository.createDefault({
          name: nextName,
          phone: form.phone.trim(),
          email: form.email.trim(),
          memo: form.memo.trim(),
        })
      );
    }

    loadCustomers();
    refreshSites();
    resetForm();
  };

  const handleDeleteClick = (customer: Customer) => {
    const deleteCheck = customerRepository.getDeleteCheck(customer.id);

    if (!deleteCheck.canDelete) {
      const linkedSiteNames = deleteCheck.linkedSites
        .map((site) => site.siteName)
        .join(", ");

      window.alert(
        `연결된 현장이 있어 삭제할 수 없습니다.\n연결 현장: ${linkedSiteNames}`
      );
      return;
    }

    const confirmed = window.confirm(
      `'${customer.name || "이름 없는 고객"}' 고객을 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`
    );

    if (!confirmed) {
      return;
    }

    const deleted = customerRepository.delete(customer.id);

    if (!deleted) {
      window.alert("고객 삭제에 실패했습니다.");
      loadCustomers();
      return;
    }

    if (editingCustomerId === customer.id) {
      resetForm();
    }

    loadCustomers();
    refreshSites();
  };

  const filteredCustomers = useMemo(() => {
    const normalized = normalizeKeyword(keyword);

    if (!normalized) {
      return customers;
    }

    return customers.filter((customer) => {
      const haystacks = [
        customer.name,
        customer.phone,
        customer.email,
        customer.memo,
      ].map((value) => normalizeKeyword(value));

      return haystacks.some((value) => value.includes(normalized));
    });
  }, [customers, keyword]);

  const linkedSiteCount = useMemo(
    () =>
      customers.reduce(
        (count, customer) =>
          count + customerRepository.getLinkedSites(customer.id).length,
        0
      ),
    [customers]
  );

  const recentUpdatedAt = customers[0]?.updatedAt ?? null;
  const isEditing = editingCustomerId !== null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff4ff_0%,#f8fafc_22%,#f8fafc_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <WorkspaceTopBar currentLabel="고객 관리" activeLink="customers" />

        <section className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Customer Workspace
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                고객 목록 조회 및 마스터 관리
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                현장에 연결되는 고객 기본 정보를 한 곳에서 관리합니다. 등록, 수정,
                삭제를 바로 처리할 수 있고 현장 연결 여부도 함께 확인할 수
                있습니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                신규 작성
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEditing ? "수정 저장" : "고객 등록"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-sm text-slate-500">전체 고객</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {customers.length}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                등록된 고객 마스터 수
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-sm text-slate-500">연결된 현장 수</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {linkedSiteCount}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                고객 기준 현장 연결 합계
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-sm text-slate-500">최근 업데이트</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                {recentUpdatedAt
                  ? new Date(recentUpdatedAt).toLocaleString("ko-KR")
                  : "-"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                최근 수정된 고객 기준
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_420px]">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  고객 목록
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  이름, 전화번호, 이메일, 메모 기준으로 검색할 수 있습니다.
                </p>
              </div>
              <div className="w-full max-w-md">
                <label className="block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  Search
                </label>
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="고객명, 연락처, 이메일, 메모 검색"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
              {filteredCustomers.length === 0 ? (
                <div className="flex min-h-80 flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#f8fafc,#f1f5f9)] px-6 py-16 text-center">
                  <div className="rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Empty State
                  </div>
                  <h3 className="mt-5 text-2xl font-bold text-slate-900">
                    {customers.length === 0
                      ? "등록된 고객이 없습니다"
                      : "검색 결과가 없습니다"}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                    {customers.length === 0
                      ? "첫 고객을 등록하면 현장 생성 및 수정 화면에서 고객 정보를 바로 연결할 수 있습니다."
                      : "검색어를 바꾸거나 신규 고객을 등록해 보세요."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setKeyword("");
                      resetForm();
                    }}
                    className="mt-6 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                  >
                    {customers.length === 0 ? "고객 등록 시작" : "검색 초기화"}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[1040px]">
                    <div className="grid grid-cols-[minmax(0,1.15fr)_160px_minmax(0,1fr)_110px_minmax(0,1.2fr)_220px] bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-600">
                      <div>고객명</div>
                      <div>전화번호</div>
                      <div>이메일</div>
                      <div>연결 현장</div>
                      <div>메모</div>
                      <div className="text-right">관리</div>
                    </div>

                    {filteredCustomers.map((customer) => {
                      const linkedSites = customerRepository.getLinkedSites(
                        customer.id
                      );

                      return (
                        <div
                          key={customer.id}
                          className="grid grid-cols-[minmax(0,1.15fr)_160px_minmax(0,1fr)_110px_minmax(0,1.2fr)_220px] items-center border-t border-slate-200 px-5 py-4 text-sm text-slate-700 transition hover:bg-slate-50/80"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/customers/${customer.id}`}
                              className="truncate font-semibold text-slate-900 transition hover:text-slate-600"
                            >
                              {customer.name || "이름 없는 고객"}
                            </Link>
                            <div className="mt-1 text-xs text-slate-400">
                              최근 수정{" "}
                              {new Date(customer.updatedAt).toLocaleDateString(
                                "ko-KR"
                              )}
                            </div>
                          </div>
                          <div>{customer.phone || "-"}</div>
                          <div className="truncate">{customer.email || "-"}</div>
                          <div>
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                              {linkedSites.length}건
                            </span>
                          </div>
                          <div className="truncate text-slate-500">
                            {customer.memo || "메모 없음"}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/customers/${customer.id}`}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              상세
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleEditClick(customer.id)}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(customer)}
                              className="rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="space-y-6">
            <CustomerForm
              form={form}
              mode={isEditing ? "edit" : "create"}
              isSubmitting={isSubmitting}
              onChange={handleFieldChange}
              onSubmit={handleSubmit}
              onCancel={resetForm}
            />

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                운영 가이드
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  고객 상세 페이지에서는 기본 정보와 연결된 현장을 함께 확인할 수
                  있습니다.
                </p>
                <p>
                  고객 삭제는 연결된 현장이 없는 경우에만 가능합니다. 연결 현장이
                  남아 있으면 삭제 전에 현장 정보부터 정리해야 합니다.
                </p>
                <p>
                  목록과 폼 모두 <code>customerRepository</code>만 사용해
                  동작하도록 구성했습니다.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
