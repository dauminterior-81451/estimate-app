"use client";

import { useEffect, useMemo, useState } from "react";
import SiteWorkspaceShell from "@/components/SiteWorkspaceShell";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { formatSiteFileDate } from "@/lib/site-files";
import { fileRepository } from "@/repositories/fileRepository";
import { useSiteStore } from "@/store/site-store";
import {
  SITE_FILE_CATEGORIES,
  type SiteFile,
  type SiteFileCategory,
} from "@/types/site-file";

type SiteFilesPageProps = {
  siteId: string;
};

const getLatestFileSavedAt = (files: SiteFile[]) => {
  if (files.length === 0) {
    return null;
  }

  return files.reduce((latest, file) => {
    if (!latest) {
      return file.updatedAt;
    }

    return new Date(file.updatedAt).getTime() > new Date(latest).getTime()
      ? file.updatedAt
      : latest;
  }, files[0]?.updatedAt ?? null);
};

export default function SiteFilesPage({ siteId }: SiteFilesPageProps) {
  const site = useSiteStore((state) =>
    state.sites.find((entry) => entry.id === siteId)
  );
  const [loaded, setLoaded] = useState(false);
  const [files, setFiles] = useState<SiteFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  useEffect(() => {
    const savedFiles = fileRepository.getBySiteId(siteId);
    setFiles(savedFiles);
    setSelectedFileId(savedFiles[0]?.id ?? null);
    setLoaded(true);
  }, [siteId]);

  const { hasUnsavedChanges, lastSavedAt, saveNow, saveStatus } = useAutoSave({
    value: files,
    enabled: loaded,
    resetKey: `files:${siteId}`,
    delay: 1000,
    getSavedAt: getLatestFileSavedAt,
    onSave: async (nextFiles) => {
      nextFiles.forEach((file) => {
        fileRepository.save(file);
      });

      const currentIds = nextFiles.map((file) => file.id);
      fileRepository
        .getBySiteId(siteId)
        .filter((file) => !currentIds.includes(file.id))
        .forEach((file) => {
          fileRepository.delete(file.id);
        });

      return {
        savedAt: getLatestFileSavedAt(nextFiles),
      };
    },
  });

  useUnsavedChangesGuard({ enabled: hasUnsavedChanges });

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) ?? null,
    [files, selectedFileId]
  );

  const syncFiles = (nextFiles: SiteFile[]) => {
    setFiles(nextFiles);
  };

  const handleCreateFile = () => {
    const newFile = fileRepository.createDefault(siteId);
    const nextFiles = [newFile, ...files];
    syncFiles(nextFiles);
    setSelectedFileId(newFile.id);
  };

  const handleUpdateFile = (
    fileId: string,
    key: "name" | "description" | "category" | "url",
    value: string
  ) => {
    const nextFiles = files.map((file) =>
      file.id === fileId
        ? {
            ...file,
            [key]: value,
            updatedAt: new Date().toISOString(),
          }
        : file
    );

    syncFiles(nextFiles);
  };

  const handleDeleteFile = (fileId: string) => {
    const target = files.find((file) => file.id === fileId);

    if (!target) {
      return;
    }

    const confirmed = window.confirm(
      `파일 "${target.name || "이름 없음"}" 항목을 삭제하시겠습니까?`
    );

    if (!confirmed) {
      return;
    }

    const nextFiles = files.filter((file) => file.id !== fileId);
    syncFiles(nextFiles);
    setSelectedFileId(nextFiles[0]?.id ?? null);
  };

  if (!site) {
    return <div className="p-8">존재하지 않거나 삭제된 현장입니다.</div>;
  }

  if (!loaded) {
    return <div className="p-8">현장 파일을 불러오는 중입니다.</div>;
  }

  return (
    <SiteWorkspaceShell
      site={site}
      activeSection="files"
      currentLabel="파일"
      activeLink="files"
      title="현장 파일"
      description="도면, 계약서, 견적서, 시공사진 등 현장별 파일 메타데이터를 정리합니다."
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
      onSave={() => {
        void saveNow();
      }}
      actions={
        <button
          type="button"
          onClick={handleCreateFile}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          새 파일 항목 추가
        </button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">파일 목록</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              {files.length}개
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {files.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                등록된 파일 항목이 없습니다. 도면, 계약서, 시공사진 같은 관리용 메타데이터를 먼저 정리해 두세요.
              </div>
            ) : null}

            {files.map((file) => {
              const isActive = file.id === selectedFileId;

              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedFileId(file.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-semibold">
                      {file.name || "이름 없음"}
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] ${
                        isActive
                          ? "bg-slate-700 text-slate-200"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {file.category}
                    </span>
                  </div>
                  <div
                    className={`mt-2 line-clamp-2 text-xs ${
                      isActive ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {file.description || "설명 없음"}
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400">
                    최근 수정: {formatSiteFileDate(file.updatedAt)}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {!selectedFile ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              선택된 파일 항목이 없습니다. 새 항목을 추가하거나 목록에서 선택하세요.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    파일 상세
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    1차 단계에서는 업로드 바이너리 대신 파일 메타데이터를 관리하고, 추후 스토리지 URL로 자연스럽게 확장할 수 있게 구성합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteFile(selectedFile.id)}
                  className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  파일 항목 삭제
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">파일명</span>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3"
                    value={selectedFile.name}
                    onChange={(event) =>
                      handleUpdateFile(
                        selectedFile.id,
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="예: 1차 평면도 PDF"
                  />
                </label>

                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">카테고리</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 p-3"
                    value={selectedFile.category}
                    onChange={(event) =>
                      handleUpdateFile(
                        selectedFile.id,
                        "category",
                        event.target.value as SiteFileCategory
                      )
                    }
                  >
                    {SITE_FILE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">설명</span>
                <textarea
                  className="min-h-32 w-full rounded-xl border border-slate-200 p-4 leading-7"
                  value={selectedFile.description}
                  onChange={(event) =>
                    handleUpdateFile(
                      selectedFile.id,
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="파일 용도, 버전, 관련 메모를 입력하세요."
                />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">URL 또는 참조값</span>
                <input
                  className="w-full rounded-xl border border-slate-200 p-3"
                  value={selectedFile.url}
                  onChange={(event) =>
                    handleUpdateFile(selectedFile.id, "url", event.target.value)
                  }
                  placeholder="예: https://... 또는 향후 스토리지 경로"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div>등록일: {formatSiteFileDate(selectedFile.createdAt)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div>최근 수정: {formatSiteFileDate(selectedFile.updatedAt)}</div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </SiteWorkspaceShell>
  );
}
