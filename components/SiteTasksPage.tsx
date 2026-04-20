"use client";

import { useEffect, useMemo, useState } from "react";
import SiteWorkspaceShell from "@/components/SiteWorkspaceShell";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { formatSiteTaskDate } from "@/lib/site-tasks";
import { taskRepository } from "@/repositories/taskRepository";
import { useSiteStore } from "@/store/site-store";
import {
  SITE_TASK_STATUSES,
  type SiteTask,
  type SiteTaskStatus,
} from "@/types/site-task";

type SiteTasksPageProps = {
  siteId: string;
};

const getLatestTaskSavedAt = (tasks: SiteTask[]) => {
  if (tasks.length === 0) {
    return null;
  }

  return tasks.reduce((latest, task) => {
    if (!latest) {
      return task.updatedAt;
    }

    return new Date(task.updatedAt).getTime() > new Date(latest).getTime()
      ? task.updatedAt
      : latest;
  }, tasks[0]?.updatedAt ?? null);
};

export default function SiteTasksPage({ siteId }: SiteTasksPageProps) {
  const site = useSiteStore((state) =>
    state.sites.find((entry) => entry.id === siteId)
  );
  const [loaded, setLoaded] = useState(false);
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const savedTasks = taskRepository.getBySiteId(siteId);
    setTasks(savedTasks);
    setSelectedTaskId(savedTasks[0]?.id ?? null);
    setLoaded(true);
  }, [siteId]);

  const { hasUnsavedChanges, lastSavedAt, saveNow, saveStatus } = useAutoSave({
    value: tasks,
    enabled: loaded,
    resetKey: `tasks:${siteId}`,
    delay: 1000,
    getSavedAt: getLatestTaskSavedAt,
    onSave: async (nextTasks) => {
      nextTasks.forEach((task) => {
        taskRepository.save(task);
      });

      const currentIds = nextTasks.map((task) => task.id);
      taskRepository
        .getBySiteId(siteId)
        .filter((task) => !currentIds.includes(task.id))
        .forEach((task) => {
          taskRepository.delete(task.id);
        });

      return {
        savedAt: getLatestTaskSavedAt(nextTasks),
      };
    },
  });

  useUnsavedChangesGuard({ enabled: hasUnsavedChanges });

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const syncTasks = (nextTasks: SiteTask[]) => {
    setTasks(nextTasks);
  };

  const handleCreateTask = () => {
    const newTask = taskRepository.createDefault(siteId);
    const nextTasks = [newTask, ...tasks];
    syncTasks(nextTasks);
    setSelectedTaskId(newTask.id);
  };

  const handleUpdateTask = (
    taskId: string,
    key: "title" | "description" | "status" | "dueDate",
    value: string
  ) => {
    const nextTasks = tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            [key]: value,
            updatedAt: new Date().toISOString(),
          }
        : task
    );

    syncTasks(nextTasks);
  };

  const handleDeleteTask = (taskId: string) => {
    const target = tasks.find((task) => task.id === taskId);

    if (!target) {
      return;
    }

    const confirmed = window.confirm(
      `작업 "${target.title || "제목 없음"}"을 삭제하시겠습니까?`
    );

    if (!confirmed) {
      return;
    }

    const nextTasks = tasks.filter((task) => task.id !== taskId);
    syncTasks(nextTasks);
    setSelectedTaskId(nextTasks[0]?.id ?? null);
  };

  if (!site) {
    return <div className="p-8">존재하지 않거나 삭제된 현장입니다.</div>;
  }

  if (!loaded) {
    return <div className="p-8">현장 작업을 불러오는 중입니다.</div>;
  }

  return (
    <SiteWorkspaceShell
      site={site}
      activeSection="tasks"
      currentLabel="작업"
      activeLink="tasks"
      title="현장 작업"
      description="현장별 할 일과 진행 상황을 기록하고 관리합니다."
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
      onSave={() => {
        void saveNow();
      }}
      actions={
        <button
          type="button"
          onClick={handleCreateTask}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          새 작업 추가
        </button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">작업 목록</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              {tasks.length}개
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                등록된 작업이 없습니다. 일정과 할 일을 현장 단위로 정리해 두세요.
              </div>
            ) : null}

            {tasks.map((task) => {
              const isActive = task.id === selectedTaskId;

              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-semibold">
                      {task.title || "제목 없음"}
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] ${
                        isActive
                          ? "bg-slate-700 text-slate-200"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <div
                    className={`mt-2 line-clamp-2 text-xs ${
                      isActive ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {task.description || "설명 없음"}
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400">
                    최근 수정: {formatSiteTaskDate(task.updatedAt)}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {!selectedTask ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              선택된 작업이 없습니다. 새 작업을 추가하거나 목록에서 선택하세요.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    작업 상세
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    작업 메모와 일정은 현장 단위로 저장되며 추후 계약, 자재, 체크리스트와 연결할 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  작업 삭제
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">작업 제목</span>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3"
                    value={selectedTask.title}
                    onChange={(event) =>
                      handleUpdateTask(
                        selectedTask.id,
                        "title",
                        event.target.value
                      )
                    }
                    placeholder="예: 1차 현장 실측"
                  />
                </label>

                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">상태</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 p-3"
                    value={selectedTask.status}
                    onChange={(event) =>
                      handleUpdateTask(
                        selectedTask.id,
                        "status",
                        event.target.value as SiteTaskStatus
                      )
                    }
                  >
                    {SITE_TASK_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">작업 내용</span>
                <textarea
                  className="min-h-32 w-full rounded-xl border border-slate-200 p-4 leading-7"
                  value={selectedTask.description}
                  onChange={(event) =>
                    handleUpdateTask(
                      selectedTask.id,
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="작업 범위, 체크 포인트, 현장 메모를 입력하세요."
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">기한</span>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 p-3"
                    value={selectedTask.dueDate}
                    onChange={(event) =>
                      handleUpdateTask(
                        selectedTask.id,
                        "dueDate",
                        event.target.value
                      )
                    }
                  />
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div>등록일: {formatSiteTaskDate(selectedTask.createdAt)}</div>
                  <div className="mt-2">최근 수정: {formatSiteTaskDate(selectedTask.updatedAt)}</div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </SiteWorkspaceShell>
  );
}
