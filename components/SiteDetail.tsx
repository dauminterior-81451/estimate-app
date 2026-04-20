"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteWorkspaceShell from "@/components/SiteWorkspaceShell";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { formatSiteFileDate } from "@/lib/site-files";
import { contractRepository } from "@/repositories/contractRepository";
import { customerRepository } from "@/repositories/customerRepository";
import { fileRepository } from "@/repositories/fileRepository";
import { noteRepository } from "@/repositories/noteRepository";
import { siteRepository } from "@/repositories/siteRepository";
import { useSiteStore } from "@/store/site-store";
import type { Site } from "@/types/site";

const contractStatusLabel = {
  draft: "초안",
  signed: "계약 완료",
  in_progress: "진행 중",
  completed: "완료",
} as const;

type SiteDetailDraft = Site;

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

export default function SiteDetail({ id }: { id: string }) {
  const router = useRouter();
  const { deleteSite, refreshSites, sites } = useSiteStore();
  const site = sites.find((entry) => entry.id === id);
  const [draft, setDraft] = useState<SiteDetailDraft | null>(null);
  const [loaded, setLoaded] = useState(false);

  const notes = useMemo(() => noteRepository.getBySiteId(id), [id]);
  const files = useMemo(() => fileRepository.getBySiteId(id), [id]);
  const contract = useMemo(() => contractRepository.getBySiteId(id), [id]);
  const customerOptions = useMemo(() => customerRepository.getOptions(), []);
  const selectedCustomer = useMemo(() => {
    if (!draft?.customerId) {
      return null;
    }

    return customerRepository.getById(draft.customerId);
  }, [draft?.customerId]);
  const customerSnapshot = useMemo(() => {
    const baseSite = draft ?? site;

    if (!baseSite) {
      return {
        id: null,
        name: "",
        phone: "",
        email: "",
        memo: "",
      };
    }

    return customerRepository.getSnapshotBySite(baseSite);
  }, [draft, site]);

  useEffect(() => {
    if (!site) {
      return;
    }

    setDraft(site);
    setLoaded(true);
  }, [site]);

  const { hasUnsavedChanges, lastSavedAt, saveNow, saveStatus } = useAutoSave({
    value: draft,
    enabled: loaded && draft !== null,
    resetKey: `site-detail:${id}`,
    delay: 1000,
    getSavedAt: (value) => value?.updatedAt ?? null,
    onSave: async (nextDraft) => {
      if (!nextDraft) {
        return {};
      }

      const normalizedCustomerId = nextDraft.customerId ?? null;
      const normalizedSite: Site = {
        ...nextDraft,
        customerId: normalizedCustomerId,
        customerName: nextDraft.customerName.trim(),
        phone: nextDraft.phone.trim(),
        email: nextDraft.email.trim(),
        siteName: nextDraft.siteName.trim(),
      };

      if (normalizedCustomerId) {
        const linkedCustomer = customerRepository.getById(normalizedCustomerId);

        if (linkedCustomer) {
          customerRepository.update(normalizedCustomerId, {
            name: normalizedSite.customerName,
            phone: normalizedSite.phone,
            email: normalizedSite.email,
          });
        }
      }

      const savedSite = siteRepository.save(normalizedSite);
      refreshSites();

      return {
        nextValue: savedSite,
        savedAt: new Date(savedSite.updatedAt ?? "").toLocaleString("ko-KR"),
      };
    },
    onAfterSave: (savedSite) => {
      if (savedSite) {
        setDraft(savedSite);
      }
    },
  });

  useUnsavedChangesGuard({ enabled: hasUnsavedChanges });

  const latestFile = files[0] ?? null;
  const latestNote = notes[0] ?? null;

  const updateDraft = <K extends keyof SiteDetailDraft>(
    key: K,
    value: SiteDetailDraft[K]
  ) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    );
  };

  const handleCustomerSelect = (customerId: string) => {
    if (!draft) {
      return;
    }

    if (!customerId) {
      setDraft({
        ...draft,
        customerId: null,
        customerName: "",
        phone: "",
        email: "",
      });
      return;
    }

    const selected = customerRepository.getById(customerId);

    if (!selected) {
      window.alert("선택한 고객 정보를 찾을 수 없습니다.");
      return;
    }

    setDraft({
      ...draft,
      customerId: selected.id,
      customerName: selected.name,
      phone: selected.phone,
      email: selected.email,
    });
  };

  const handleDelete = () => {
    if (!site) {
      return;
    }

    const confirmed = window.confirm(
      `${site.siteName} 현장을 삭제하시겠습니까?\n연결된 견적, 메모, 파일, 작업, 계약 데이터도 함께 삭제됩니다.`
    );

    if (!confirmed) {
      return;
    }

    const deleted = deleteSite(site.id);

    if (!deleted) {
      window.alert("이미 삭제했거나 존재하지 않는 현장입니다.");
      router.replace("/sites");
      return;
    }

    window.alert("현장과 연결된 데이터가 삭제되었습니다.");
    router.replace("/sites");
  };

  if (!site || !draft) {
    return <div className="p-8">존재하지 않거나 삭제된 현장입니다.</div>;
  }

  return (
    <SiteWorkspaceShell
      site={site}
      activeSection="estimate"
      currentLabel="상세"
      activeLink="detail"
      title="현장 상세"
      description="현장 기본 정보와 고객 연결 상태를 관리합니다. 고객 선택과 현장명 변경은 자동 저장됩니다."
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
      onSave={() => {
        void saveNow();
      }}
      actions={
        <>
          <Link
            href={`/sites/${id}/estimate`}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            견적서 작성
          </Link>
          <Link
            href={`/sites/${id}/contract`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            계약 보기
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            현장 삭제
          </button>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_340px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                현장 생성 / 수정
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                고객을 드롭다운에서 선택하면 현장에 고객 ID와 기본 연락처가 함께
                저장됩니다.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              마지막 저장
              <div className="mt-1 font-medium text-slate-700">
                {lastSavedAt ?? "-"}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="text-sm text-slate-700">
              <span className="mb-2 block font-medium">현장명</span>
              <input
                className={inputClassName}
                value={draft.siteName}
                onChange={(event) => updateDraft("siteName", event.target.value)}
                placeholder="현장명을 입력하세요"
              />
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    고객 선택
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    등록된 고객 마스터에서 선택하면 이름, 연락처, 이메일이 자동
                    반영됩니다.
                  </p>
                </div>
                <Link
                  href="/customers"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  고객 관리
                </Link>
              </div>

              <div className="mt-4">
                {customerOptions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                    등록된 고객이 없습니다. 먼저 고객 관리에서 고객을 추가한 뒤
                    선택하세요.
                  </div>
                ) : (
                  <select
                    className={inputClassName}
                    value={draft.customerId ?? ""}
                    onChange={(event) => handleCustomerSelect(event.target.value)}
                  >
                    <option value="">고객을 선택하세요</option>
                    {customerOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                        {option.description ? ` · ${option.description}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedCustomer ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                    <div className="text-slate-500">선택된 고객</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {selectedCustomer.name || "-"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                    <div className="text-slate-500">연락처</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {selectedCustomer.phone || selectedCustomer.email || "-"}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                <span className="mb-2 block font-medium">고객명</span>
                <input
                  className={inputClassName}
                  value={draft.customerName}
                  onChange={(event) =>
                    updateDraft("customerName", event.target.value)
                  }
                  placeholder="고객명을 입력하세요"
                />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-2 block font-medium">연락처</span>
                <input
                  className={inputClassName}
                  value={draft.phone}
                  onChange={(event) => updateDraft("phone", event.target.value)}
                  placeholder="연락처를 입력하세요"
                />
              </label>
            </div>

            <label className="text-sm text-slate-700">
              <span className="mb-2 block font-medium">이메일</span>
              <input
                className={inputClassName}
                value={draft.email}
                onChange={(event) => updateDraft("email", event.target.value)}
                placeholder="이메일을 입력하세요"
              />
            </label>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">선택 요약</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-slate-500">현장명</div>
                <div className="mt-1 font-medium text-slate-900">
                  {draft.siteName || "-"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-slate-500">고객 연결 상태</div>
                <div className="mt-1 font-medium text-slate-900">
                  {draft.customerId ? "고객 연결됨" : "고객 미선택"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-slate-500">고객명</div>
                <div className="mt-1 font-medium text-slate-900">
                  {customerSnapshot.name || "미지정 고객"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-slate-500">연락처</div>
                <div className="mt-1 text-slate-600">
                  {customerSnapshot.phone || "연락처 없음"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-slate-500">이메일</div>
                <div className="mt-1 text-slate-600">
                  {customerSnapshot.email || "이메일 없음"}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">운영 메모</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>
                고객 선택 시 <code>customerId</code>와 함께 기존
                <code>customerName</code>, <code>phone</code>,
                <code>email</code> 값도 같이 저장됩니다.
              </p>
              <p>
                고객을 선택하지 않아도 수동 입력은 가능하며, 기존 데이터 구조와
                호환됩니다.
              </p>
            </div>
          </section>
        </aside>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">현장 메모</h2>
              <p className="mt-1 text-sm text-slate-500">
                상담 내용, 요청사항, 특이사항을 현장 단위로 정리합니다.
              </p>
            </div>
            <Link
              href={`/sites/${id}/notes`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              메모 보기
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">메모 개수</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {notes.length}
              </div>
              <div className="mt-4 text-sm text-slate-500">최근 수정</div>
              <div className="mt-2 text-sm font-medium text-slate-700">
                {latestNote?.updatedAt ?? "-"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {latestNote ? (
                <>
                  <div className="text-sm font-semibold text-slate-900">
                    {latestNote.title || "제목 없음"}
                  </div>
                  <div className="mt-3 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {latestNote.content || "본문 없음"}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500">
                  아직 등록된 메모가 없습니다. 현장 메모에서 상담 내용과 요청사항을
                  기록하세요.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">현장 파일</h2>
              <p className="mt-1 text-sm text-slate-500">
                도면, 계약서, 견적서, 시공사진 같은 파일 메타데이터를 관리합니다.
              </p>
            </div>
            <Link
              href={`/sites/${id}/files`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              파일 보기
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">파일 항목 수</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {files.length}
              </div>
              <div className="mt-4 text-sm text-slate-500">최근 수정</div>
              <div className="mt-2 text-sm font-medium text-slate-700">
                {latestFile ? formatSiteFileDate(latestFile.updatedAt) : "-"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {latestFile ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900">
                      {latestFile.name || "이름 없음"}
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] text-slate-500">
                      {latestFile.category}
                    </span>
                  </div>
                  <div className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {latestFile.description || "설명 없음"}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500">
                  아직 등록된 파일 항목이 없습니다. 현장 파일 메뉴에서 도면,
                  계약서, 시공사진 메타데이터를 정리하세요.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">계약 상태</h2>
              <p className="mt-1 text-sm text-slate-500">
                현장별 계약 진행 상태와 메모를 계약 페이지에서 이어서 관리합니다.
              </p>
            </div>
            <Link
              href={`/sites/${id}/contract`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              계약 보기
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">계약 상태</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {contract ? contractStatusLabel[contract.status] : "초안"}
              </div>
              <div className="mt-4 text-sm text-slate-500">최근 수정</div>
              <div className="mt-2 text-sm font-medium text-slate-700">
                {contract ? new Date(contract.updatedAt).toLocaleString("ko-KR") : "-"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">계약 메모</div>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {contract?.note || "등록된 계약 메모가 없습니다."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteWorkspaceShell>
  );
}
