"use client";

import Link from "next/link";
import type { AutoSaveStatus } from "@/hooks/useAutoSave";
import type { Site } from "@/types/site";

type SiteLinkKey =
  | "detail"
  | "estimate"
  | "preview"
  | "notes"
  | "files"
  | "tasks"
  | "contract";

type WorkspaceTopBarActiveLink =
  | SiteLinkKey
  | "sites"
  | "customers"
  | "dashboard";

type WorkspaceTopBarProps = {
  site?: Site;
  currentLabel: string;
  activeLink?: WorkspaceTopBarActiveLink;
  saveStatus?: AutoSaveStatus;
  lastSavedAt?: string | null;
  onSave?: () => void;
};

const saveStatusLabel: Record<AutoSaveStatus, string> = {
  saved: "저장됨",
  saving: "저장 중",
  dirty: "저장 필요",
};

const saveStatusClassName: Record<AutoSaveStatus, string> = {
  saved: "border-green-200 bg-green-50 text-green-700",
  saving: "border-blue-200 bg-blue-50 text-blue-700",
  dirty: "border-amber-200 bg-amber-50 text-amber-700",
};

const getSiteLinks = (siteId: string) => [
  { key: "detail" as const, label: "현장 상세", href: `/sites/${siteId}` },
  { key: "estimate" as const, label: "견적", href: `/sites/${siteId}/estimate` },
  {
    key: "preview" as const,
    label: "미리보기",
    href: `/sites/${siteId}/estimate/preview`,
  },
  { key: "notes" as const, label: "메모", href: `/sites/${siteId}/notes` },
  { key: "files" as const, label: "파일", href: `/sites/${siteId}/files` },
  { key: "tasks" as const, label: "작업", href: `/sites/${siteId}/tasks` },
  { key: "contract" as const, label: "계약", href: `/sites/${siteId}/contract` },
];

const globalLinks = [
  { key: "dashboard" as const, label: "대시보드", href: "/dashboard" },
  { key: "sites" as const, label: "현장 목록", href: "/sites" },
  { key: "customers" as const, label: "고객 관리", href: "/customers" },
];

export default function WorkspaceTopBar({
  site,
  currentLabel,
  activeLink,
  saveStatus,
  lastSavedAt,
  onSave,
}: WorkspaceTopBarProps) {
  const siteLinks = site ? getSiteLinks(site.id) : [];

  return (
    <div className="mb-4 rounded-3xl border border-slate-200/80 bg-white/95 px-5 py-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <Link
            href="/dashboard"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition hover:text-slate-600"
          >
            Daum Interior
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">
              {site?.siteName ?? "업무 관리"}
            </span>
            <span className="text-slate-300">/</span>
            <span>{currentLabel}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {globalLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activeLink === link.key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {siteLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activeLink === link.key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {(saveStatus || onSave) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {saveStatus ? (
              <span
                className={`rounded-full border px-3 py-1.5 font-medium ${saveStatusClassName[saveStatus]}`}
              >
                {saveStatusLabel[saveStatus]}
              </span>
            ) : null}
            <span>
              {lastSavedAt ? `마지막 저장 ${lastSavedAt}` : "마지막 저장 -"}
            </span>
            {onSave ? (
              <button
                type="button"
                onClick={onSave}
                disabled={saveStatus === "saving"}
                className="rounded-full bg-slate-900 px-3 py-1.5 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                지금 저장
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
