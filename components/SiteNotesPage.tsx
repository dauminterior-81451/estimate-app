"use client";

import { useEffect, useMemo, useState } from "react";
import SiteWorkspaceShell from "@/components/SiteWorkspaceShell";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { noteRepository } from "@/repositories/noteRepository";
import { useSiteStore } from "@/store/site-store";
import type { SiteNote } from "@/types/site-note";

type SiteNotesPageProps = {
  siteId: string;
};

const getLatestNoteSavedAt = (notes: SiteNote[]) => {
  if (notes.length === 0) {
    return null;
  }

  return notes.reduce((latest, note) => {
    if (!latest) {
      return note.updatedAt;
    }

    return new Date(note.updatedAt).getTime() > new Date(latest).getTime()
      ? note.updatedAt
      : latest;
  }, notes[0]?.updatedAt ?? null);
};

export default function SiteNotesPage({ siteId }: SiteNotesPageProps) {
  const site = useSiteStore((state) =>
    state.sites.find((entry) => entry.id === siteId)
  );
  const [loaded, setLoaded] = useState(false);
  const [notes, setNotes] = useState<SiteNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  useEffect(() => {
    const savedNotes = noteRepository.getBySiteId(siteId);
    setNotes(savedNotes);
    setSelectedNoteId(savedNotes[0]?.id ?? null);
    setLoaded(true);
  }, [siteId]);

  const { hasUnsavedChanges, lastSavedAt, saveNow, saveStatus } = useAutoSave({
    value: notes,
    enabled: loaded,
    resetKey: `notes:${siteId}`,
    delay: 1000,
    getSavedAt: getLatestNoteSavedAt,
    onSave: async (nextNotes) => {
      nextNotes.forEach((note) => {
        noteRepository.save(note);
      });

      const currentIds = nextNotes.map((note) => note.id);
      noteRepository
        .getBySiteId(siteId)
        .filter((note) => !currentIds.includes(note.id))
        .forEach((note) => {
          noteRepository.delete(note.id);
        });

      return {
        savedAt: getLatestNoteSavedAt(nextNotes),
      };
    },
  });

  useUnsavedChangesGuard({ enabled: hasUnsavedChanges });

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  const syncNotes = (nextNotes: SiteNote[]) => {
    setNotes(nextNotes);
  };

  const handleCreateNote = () => {
    const newNote = noteRepository.createDefault(siteId);
    const nextNotes = [newNote, ...notes];
    syncNotes(nextNotes);
    setSelectedNoteId(newNote.id);
  };

  const handleUpdateNote = (
    noteId: string,
    key: "title" | "content",
    value: string
  ) => {
    const nextNotes = notes.map((note) =>
      note.id === noteId
        ? {
            ...note,
            [key]: value,
            updatedAt: new Date().toLocaleString("ko-KR"),
          }
        : note
    );

    syncNotes(nextNotes);
  };

  const handleDeleteNote = (noteId: string) => {
    const target = notes.find((note) => note.id === noteId);

    if (!target) {
      return;
    }

    const confirmed = window.confirm(
      `메모 "${target.title || "제목 없음"}"을 삭제하시겠습니까?`
    );

    if (!confirmed) {
      return;
    }

    const nextNotes = notes.filter((note) => note.id !== noteId);
    syncNotes(nextNotes);
    setSelectedNoteId(nextNotes[0]?.id ?? null);
  };

  if (!site) {
    return <div className="p-8">존재하지 않거나 삭제된 현장입니다.</div>;
  }

  if (!loaded) {
    return <div className="p-8">현장 메모를 불러오는 중입니다.</div>;
  }

  return (
    <SiteWorkspaceShell
      site={site}
      activeSection="notes"
      currentLabel="메모"
      activeLink="notes"
      title="현장 메모"
      description="상담 내용, 요청사항, 특이사항, 공사 메모를 현장 단위로 기록하고 관리합니다."
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
      onSave={() => {
        void saveNow();
      }}
      actions={
        <button
          type="button"
          onClick={handleCreateNote}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          새 메모 추가
        </button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">메모 목록</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              {notes.length}개
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {notes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                등록된 메모가 없습니다. 상담 내용이나 요청사항을 기록해 두세요.
              </div>
            ) : null}

            {notes.map((note) => {
              const isActive = note.id === selectedNoteId;

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="truncate text-sm font-semibold">
                    {note.title || "제목 없음"}
                  </div>
                  <div
                    className={`mt-2 line-clamp-2 text-xs ${
                      isActive ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {note.content || "본문 없음"}
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400">
                    최근 수정: {note.updatedAt}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {!selectedNote ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              선택된 메모가 없습니다. 새 메모를 추가하거나 목록에서 선택하세요.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    메모 상세
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    실무 메모는 현장 단위로 저장되며 추후 files, tasks, contract와 연결할 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(selectedNote.id)}
                  className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  메모 삭제
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">메모 제목</span>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3"
                    value={selectedNote.title}
                    onChange={(event) =>
                      handleUpdateNote(
                        selectedNote.id,
                        "title",
                        event.target.value
                      )
                    }
                    placeholder="예: 1차 상담 요청사항"
                  />
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div>생성일: {selectedNote.createdAt}</div>
                  <div className="mt-2">최근 수정: {selectedNote.updatedAt}</div>
                </div>
              </div>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">메모 본문</span>
                <textarea
                  className="min-h-[320px] w-full rounded-xl border border-slate-200 p-4 leading-7"
                  value={selectedNote.content}
                  onChange={(event) =>
                    handleUpdateNote(
                      selectedNote.id,
                      "content",
                      event.target.value
                    )
                  }
                  placeholder={[
                    "상담 내용",
                    "- 고객 요구사항",
                    "- 예산 범위",
                    "- 일정 메모",
                    "",
                    "특이사항",
                    "- 현장 방문 시 확인할 점",
                    "- 자재/도면 관련 참고사항",
                  ].join("\n")}
                />
              </label>
            </div>
          )}
        </section>
      </div>
    </SiteWorkspaceShell>
  );
}
