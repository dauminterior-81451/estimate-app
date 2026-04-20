"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import WorkspaceTopBar from "@/components/WorkspaceTopBar";
import type { AutoSaveStatus } from "@/hooks/useAutoSave";
import { customerRepository } from "@/repositories/customerRepository";
import type { Site } from "@/types/site";

type SectionKey =
  | "estimate"
  | "notes"
  | "files"
  | "tasks"
  | "contract"
  | "materials"
  | "settlement"
  | "options"
  | "history";

type TopBarLinkKey =
  | "detail"
  | "estimate"
  | "preview"
  | "notes"
  | "files"
  | "tasks"
  | "contract";

type SiteWorkspaceShellProps = {
  site: Site;
  activeSection: SectionKey;
  currentLabel: string;
  activeLink: TopBarLinkKey;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  saveStatus?: AutoSaveStatus;
  lastSavedAt?: string | null;
  onSave?: () => void;
};

const sections: {
  href: (siteId: string) => string;
  key: SectionKey;
  label: string;
  upcoming?: boolean;
}[] = [
  {
    key: "estimate",
    label: "견적서",
    href: (siteId) => `/sites/${siteId}/estimate`,
  },
  {
    key: "notes",
    label: "메모",
    href: (siteId) => `/sites/${siteId}/notes`,
  },
  {
    key: "files",
    label: "파일",
    href: (siteId) => `/sites/${siteId}/files`,
  },
  {
    key: "tasks",
    label: "작업",
    href: (siteId) => `/sites/${siteId}/tasks`,
  },
  {
    key: "contract",
    label: "계약",
    href: (siteId) => `/sites/${siteId}/contract`,
  },
  {
    key: "materials",
    label: "자재 입출",
    href: (siteId) => `/sites/${siteId}`,
    upcoming: true,
  },
  {
    key: "settlement",
    label: "입금 / 정산",
    href: (siteId) => `/sites/${siteId}`,
    upcoming: true,
  },
  {
    key: "options",
    label: "옵션관리",
    href: (siteId) => `/sites/${siteId}`,
    upcoming: true,
  },
  {
    key: "history",
    label: "발송이력",
    href: (siteId) => `/sites/${siteId}`,
    upcoming: true,
  },
];

export default function SiteWorkspaceShell({
  site,
  activeSection,
  currentLabel,
  activeLink,
  title,
  description,
  actions,
  children,
  saveStatus,
  lastSavedAt,
  onSave,
}: SiteWorkspaceShellProps) {
  const customer = useMemo(
    () => customerRepository.getSnapshotBySite(site),
    [site]
  );

  return (
    <div className="min-h-screen bg-[#f5f6f8] p-8">
      <div className="mx-auto max-w-7xl">
        <WorkspaceTopBar
          site={site}
          currentLabel={currentLabel}
          activeLink={activeLink}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          onSave={onSave}
        />

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Site
              </p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">
                {site.siteName}
              </h2>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div>고객명: {customer.name || "-"}</div>
                <div>연락처: {customer.phone || "-"}</div>
                <div>이메일: {customer.email || "-"}</div>
                <div>작성일: {site.createdAt}</div>
                <div>상태: {site.status}</div>
              </div>
            </section>

            <nav className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 px-3 pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Workspace
              </div>
              <div className="space-y-1">
                {sections.map((section) => {
                  const isActive = section.key === activeSection;

                  return (
                    <Link
                      key={section.key}
                      href={section.href(site.id)}
                      className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm transition ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span>{section.label}</span>
                      {section.upcoming ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            isActive
                              ? "bg-slate-700 text-slate-200"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          예정
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </aside>

          <section className="space-y-6">{children}</section>
        </div>
      </div>
    </div>
  );
}
