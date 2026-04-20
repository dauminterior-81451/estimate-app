"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import EstimateDocument from "@/components/EstimateDocument";
import SiteWorkspaceShell from "@/components/SiteWorkspaceShell";
import { useEstimateState } from "@/features/estimate/hooks/useEstimateState";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import {
  calcCategory,
  calcItem,
  calcTotal,
} from "@/features/estimate/logic/calculateEstimate";
import {
  createEstimatePreviewUrl,
  isValidEmail,
  type SendEstimateEmailPayload,
} from "@/lib/estimate-email";
import { customerRepository } from "@/repositories/customerRepository";
import { estimateRepository } from "@/repositories/estimateRepository";
import { useSiteStore } from "@/store/site-store";
import type { Estimate } from "@/types/estimate";

export type EstimateEditorProps = {
  siteId: string;
};

type MailState = "idle" | "sending" | "success" | "error";
type PendingEstimateAction = "create" | "preview" | "switch" | null;
type Html2CanvasFunction = typeof import("html2canvas").default;
type JsPdfConstructor = typeof import("jspdf").jsPDF;

const PDF_CAPTURE_COLOR_STYLE = {
  "--color-slate-50": "#f8fafc",
  "--color-slate-100": "#f1f5f9",
  "--color-slate-200": "#e2e8f0",
  "--color-slate-300": "#cbd5e1",
  "--color-slate-400": "#94a3b8",
  "--color-slate-500": "#64748b",
  "--color-slate-600": "#475569",
  "--color-slate-700": "#334155",
  "--color-slate-900": "#0f172a",
  "--color-slate-950": "#020617",
  "--color-white": "#ffffff",
} as CSSProperties;

const HIDDEN_PDF_CAPTURE_STYLE: CSSProperties = {
  left: "-10000px",
  pointerEvents: "none",
  position: "fixed",
  top: 0,
  width: "960px",
  zIndex: -1,
};

const formatPriceInput = (value: string) => {
  const normalized = value.replace(/,/g, "");

  if (normalized === "") {
    return "";
  }

  const match = normalized.match(/^(-?)(\d*)(\.\d*)?$/);

  if (!match) {
    return normalized;
  }

  const [, sign, integerPart, decimalPart = ""] = match;

  if (integerPart === "" && decimalPart) {
    return `${sign}0${decimalPart}`;
  }

  if (integerPart === "") {
    return sign;
  }

  return `${sign}${integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${decimalPart}`;
};

const parsePriceInput = (value: string) => {
  const normalized = value.replace(/,/g, "").trim();

  if (normalized === "") {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? null : parsed;
};

const flattenEstimateItems = (estimate: Estimate) =>
  estimate.categories.flatMap((category) =>
    category.items
      .map((item) => ({
        name: item.name.trim(),
        amount: calcItem(item.qty, item.price),
      }))
      .filter((item) => item.name.length > 0)
  );

const compareEstimateVersions = (
  currentEstimate: Estimate,
  previousEstimate: Estimate
) => {
  const currentItems = flattenEstimateItems(currentEstimate);
  const previousItems = flattenEstimateItems(previousEstimate);
  const currentMap = new Map(currentItems.map((item) => [item.name, item.amount]));
  const previousMap = new Map(
    previousItems.map((item) => [item.name, item.amount])
  );

  const addedCount = currentItems.filter(
    (item) => !previousMap.has(item.name)
  ).length;
  const removedCount = previousItems.filter(
    (item) => !currentMap.has(item.name)
  ).length;
  const changedCount = currentItems.filter(
    (item) =>
      previousMap.has(item.name) && previousMap.get(item.name) !== item.amount
  ).length;

  return {
    addedCount,
    removedCount,
    changedCount,
  };
};

export default function EstimateEditor({ siteId }: EstimateEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedEstimateId = searchParams.get("estimateId");
  const site = useSiteStore((state) =>
    state.sites.find((entry) => entry.id === siteId)
  );

  const customer = useMemo(
    () => (site ? customerRepository.getSnapshotBySite(site) : null),
    [site]
  );
  const {
    draft,
    setDraft,
    updateDraft,
    updateCategory,
    updateItem,
    addCategory,
    duplicateCategory,
    removeCategory,
    addItem,
    duplicateItem,
    removeItem,
  } = useEstimateState(estimateRepository.createDefault(siteId));
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [mailRecipient, setMailRecipient] = useState("");
  const [mailState, setMailState] = useState<MailState>("idle");
  const [mailMessage, setMailMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pendingAction, setPendingAction] =
    useState<PendingEstimateAction>(null);
  const pdfCaptureRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const nextEstimates = estimateRepository.getEstimatesBySite(siteId);
    const latestEstimate = nextEstimates[0] ?? null;
    const estimate = selectedEstimateId
      ? estimateRepository.getById(selectedEstimateId) ?? latestEstimate
      : latestEstimate;

    setEstimates(nextEstimates);
    setEditingPrices({});
    setDraft(estimate ?? estimateRepository.createDefault(siteId));
    setLoaded(true);
  }, [siteId, selectedEstimateId, setDraft]);

  useEffect(() => {
    setMailRecipient(customer?.email ?? "");
  }, [customer?.email]);

  const currentEstimateId = useMemo(() => {
    if (
      selectedEstimateId &&
      estimates.some((estimate) => estimate.id === selectedEstimateId)
    ) {
      return selectedEstimateId;
    }

    return estimates[0]?.id ?? null;
  }, [estimates, selectedEstimateId]);

  const currentEstimate = useMemo(
    () =>
      currentEstimateId
        ? estimates.find((estimate) => estimate.id === currentEstimateId) ?? null
        : estimates[0] ?? null,
    [currentEstimateId, estimates]
  );

  const previousEstimate = useMemo(() => {
    if (!currentEstimate) {
      return null;
    }

    const currentIndex = estimates.findIndex(
      (estimate) => estimate.id === currentEstimate.id
    );

    if (currentIndex === -1) {
      return null;
    }

    return estimates[currentIndex + 1] ?? null;
  }, [currentEstimate, estimates]);

  const estimateChangeSummary = useMemo(() => {
    if (!currentEstimate || !previousEstimate) {
      return null;
    }

    return compareEstimateVersions(currentEstimate, previousEstimate);
  }, [currentEstimate, previousEstimate]);

  const getEstimateEditorHref = (estimateId: string | null) =>
    estimateId
      ? `/sites/${siteId}/estimate?estimateId=${estimateId}`
      : `/sites/${siteId}/estimate`;

  const getEstimatePreviewHref = (estimateId: string | null) =>
    estimateId
      ? `/sites/${siteId}/estimate/preview?estimateId=${estimateId}`
      : `/sites/${siteId}/estimate/preview`;

  const createEstimatePdfBlob = async () => {
    const previewElement = pdfCaptureRef.current;

    if (!previewElement) {
      throw new Error("PDF 캡처 대상을 찾을 수 없습니다.");
    }

    const [html2canvasModule, jsPdfModule] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const html2canvasDefault = html2canvasModule.default as unknown;
    const html2canvas =
      typeof html2canvasModule.default === "function"
        ? (html2canvasModule.default as Html2CanvasFunction)
        : (html2canvasDefault as Html2CanvasFunction);
    const jsPdfDefault = jsPdfModule.default as unknown;
    const JsPdf =
      jsPdfModule.jsPDF ??
      (typeof jsPdfDefault === "object" &&
      jsPdfDefault !== null &&
      "jsPDF" in jsPdfDefault
        ? (jsPdfDefault as { jsPDF: JsPdfConstructor }).jsPDF
        : jsPdfDefault);

    if (typeof JsPdf !== "function") {
      throw new Error("jsPDF module could not be loaded.");
    }

    if ("fonts" in document) {
      await document.fonts.ready;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const canvas = await html2canvas(previewElement, {
      backgroundColor: "#ffffff",
      logging: false,
      scale: Math.min(window.devicePixelRatio || 1, 2),
      useCORS: true,
      windowWidth: previewElement.scrollWidth,
    });

    const imageData = canvas.toDataURL("image/png");
    const pdf = new (JsPdf as JsPdfConstructor)({
      format: "a4",
      orientation: "portrait",
      unit: "mm",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;
    const imageHeight = (canvas.height * printableWidth) / canvas.width;
    let remainingHeight = imageHeight;
    let position = margin;

    pdf.addImage(imageData, "PNG", margin, position, printableWidth, imageHeight);
    remainingHeight -= printableHeight;

    while (remainingHeight > 0) {
      position = margin - (imageHeight - remainingHeight);
      pdf.addPage();
      pdf.addImage(
        imageData,
        "PNG",
        margin,
        position,
        printableWidth,
        imageHeight
      );
      remainingHeight -= printableHeight;
    }

    const fileName = `${
      (draft.title || "견적서").replace(/[\\/:*?"<>|]+/g, "").trim() || "견적서"
    }.pdf`;

    return {
      blob: pdf.output("blob"),
      fileName,
    };
  };

  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("PDF 파일을 읽을 수 없습니다."));
          return;
        }

        const [, base64 = ""] = reader.result.split(",");

        if (!base64) {
          reject(new Error("PDF 파일 변환에 실패했습니다."));
          return;
        }

        resolve(base64);
      };

      reader.onerror = () => {
        reject(reader.error ?? new Error("PDF 파일을 읽는 중 오류가 발생했습니다."));
      };

      reader.readAsDataURL(blob);
    });

  const createNextEstimate = async () => {
    if (pendingAction !== null) {
      return;
    }

    setPendingAction("create");

    try {
      if (hasUnsavedChanges) {
        await saveNow();
      }

      const nextVersion =
        (estimates.reduce(
          (maxVersion, estimate) =>
            estimate.version > maxVersion ? estimate.version : maxVersion,
          0
        ) || 0) + 1;

      const nextEstimate = estimateRepository.createEstimate({
        id: `${siteId}:${nextVersion}`,
        siteId,
        ...draft,
        version: nextVersion,
        name: `${nextVersion}차 견적`,
        categories: JSON.parse(JSON.stringify(draft.categories)),
        updatedAt: new Date().toISOString(),
      });

      setEstimates(estimateRepository.getEstimatesBySite(siteId));
      router.push(getEstimateEditorHref(nextEstimate.id));
    } finally {
      setPendingAction(null);
    }
  };

  const { hasUnsavedChanges, lastSavedAt, saveNow, saveStatus } = useAutoSave({
    value: draft,
    enabled: loaded,
    resetKey: `estimate:${siteId}:${currentEstimateId ?? "latest"}`,
    delay: 1000,
    getSavedAt: (value) => value.updatedAt,
    onSave: async (nextDraft) => {
      const savedAt = new Date().toLocaleString("ko-KR");
      const savedDraft = {
        ...nextDraft,
        updatedAt: savedAt,
      };

      estimateRepository.save({
        id: currentEstimateId ?? siteId,
        siteId,
        ...savedDraft,
      });

      return {
        nextValue: savedDraft,
        savedAt,
      };
    },
    onAfterSave: (savedDraft) => {
      setEstimates(estimateRepository.getEstimatesBySite(siteId));
      setDraft(savedDraft);
    },
  });
  const isCurrentEstimateLatest = currentEstimateId === estimates[0]?.id;
  const isEstimateNavigationPending =
    pendingAction !== null || saveStatus === "saving";
  const isInitialEntry = estimates.length === 0 && currentEstimateId === null;
  const currentEstimateVersionLabel = currentEstimate
    ? `${currentEstimate.version}차 견적`
    : "미저장 초안";
  const currentEstimateDisplayId = currentEstimateId ?? siteId;
  const saveStatusToneClass =
    saveStatus === "saving"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : saveStatus === "dirty"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-green-200 bg-green-50 text-green-700";
  const saveStatusLabel =
    saveStatus === "saving"
      ? "저장 중"
      : saveStatus === "dirty"
        ? "저장 필요"
        : "저장 완료";
  const saveStatusDetail =
    saveStatus === "saving"
      ? "변경사항을 저장하고 있습니다."
      : saveStatus === "dirty"
        ? "아직 저장되지 않은 변경사항이 있습니다."
        : lastSavedAt
          ? `${lastSavedAt} 기준 저장되었습니다.`
          : "현재 내용이 저장된 상태입니다.";

  useUnsavedChangesGuard({
    enabled: hasUnsavedChanges,
    message: "저장되지 않은 변경사항이 있습니다. 페이지를 나가시겠습니까?",
  });

  const handleSelectEstimate = async (estimateId: string) => {
    if (estimateId === currentEstimateId || pendingAction !== null) {
      return;
    }

    setPendingAction("switch");

    try {
      if (hasUnsavedChanges) {
        await saveNow();
      }

      router.push(getEstimateEditorHref(estimateId));
    } finally {
      setPendingAction(null);
    }
  };

  const handleOpenPreview = async () => {
    if (pendingAction !== null) {
      return;
    }

    setPendingAction("preview");

    try {
      if (hasUnsavedChanges) {
        await saveNow();
      }

      router.push(getEstimatePreviewHref(currentEstimateId));
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemoveCategory = (categoryId: string, categoryName: string) => {
    const targetName = categoryName.trim() || "이 품목";
    const isLastCategory = draft.categories.length === 1;
    const confirmMessage = isLastCategory
      ? `"${targetName}"을 삭제할까요? 마지막 품목이 삭제되어 견적 항목이 모두 비게 됩니다.`
      : `"${targetName}"을 삭제할까요? 포함된 항목도 함께 삭제됩니다.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    removeCategory(categoryId);
  };

  const handleRemoveItem = (
    categoryId: string,
    itemId: string,
    itemName: string
  ) => {
    const targetName = itemName.trim() || "이 항목";
    const category = draft.categories.find((entry) => entry.id === categoryId);
    const isLastItemInCategory = (category?.items.length ?? 0) === 1;
    const confirmMessage = isLastItemInCategory
      ? `"${targetName}"을 삭제할까요? 이 품목에 남은 마지막 항목입니다.`
      : `"${targetName}"을 삭제할까요?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    removeItem(categoryId, itemId);
  };

  const sendEmail = async () => {
    if (!site || !customer) {
      return;
    }

    if (mailState === "sending") {
      return;
    }

    const recipient = mailRecipient.trim();

    if (!recipient) {
      setMailState("error");
      setMailMessage("수신 이메일을 입력해주세요.");
      return;
    }

    if (!isValidEmail(recipient)) {
      setMailState("error");
      setMailMessage("수신 이메일 형식이 올바르지 않습니다.");
      return;
    }

    setMailState("sending");
    setMailMessage("현재 선택된 견적 PDF를 생성하고 있습니다.");

    try {
      if (hasUnsavedChanges) {
        await saveNow();
      }

      const { blob, fileName } = await createEstimatePdfBlob();

      if (!fileName.trim()) {
        throw new Error("PDF 파일명을 생성할 수 없습니다.");
      }

      if (blob.size === 0) {
        throw new Error("PDF 파일 생성에 실패했습니다.");
      }

      const pdfBase64 = await blobToBase64(blob);
      const previewUrl = createEstimatePreviewUrl(
        window.location.origin,
        siteId,
        currentEstimateId ?? undefined
      );
      const payload: SendEstimateEmailPayload = {
        to: recipient,
        customerName: customer.name,
        estimateDate: draft.estimateDate,
        estimateId: currentEstimateId ?? undefined,
        note: draft.note,
        pdfBase64,
        pdfFileName: fileName,
        previewUrl,
        siteId,
        siteName: site.siteName,
        title: draft.title,
        totals,
      };

      setMailMessage("PDF 파일을 첨부해 이메일을 발송하고 있습니다.");

      const response = await fetch("/api/send-estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as
        | {
            error?: string;
            message?: string;
            success?: boolean;
          }
        | null;

      if (!result) {
        throw new Error("이메일 발송 응답을 확인할 수 없습니다.");
      }

      const responseError =
        result.error ||
        result.message ||
        `이메일 발송에 실패했습니다. (status: ${response.status})`;

      if (!response.ok || !result.success) {
        throw new Error(responseError);
      }

      setMailState("success");
      setMailMessage(result.message || "견적 PDF 이메일을 발송했습니다.");
    } catch (error) {
      setMailState("error");
      setMailMessage(
        error instanceof Error
          ? error.message
          : "이메일 발송 중 오류가 발생했습니다."
      );
    }
  };

  if (!siteId || !site || !customer) {
    return <div className="p-8">존재하지 않거나 삭제된 현장입니다.</div>;
  }

  if (!loaded) {
    return <div className="p-8">견적서를 불러오는 중입니다.</div>;
  }

  const totals = calcTotal(draft.categories, draft.vat);
  const customerName = customer.name || "미지정 고객";
  const customerPhone = customer.phone || "연락처 없음";
  const customerEmail = customer.email || "이메일 없음";
  const namedItemCount = draft.categories.reduce(
    (count, category) =>
      count +
      category.items.filter((item) => item.name.trim().length > 0).length,
    0
  );
  const previewMissingLabels = [
    draft.title.trim().length === 0 ? "견적서 제목" : null,
    draft.estimateDate.trim().length === 0 ? "견적일" : null,
    customer.name.trim().length === 0 ? "고객명" : null,
    namedItemCount === 0 ? "입력된 항목" : null,
  ].filter((label): label is string => label !== null);
  const previewButtonLabel =
    pendingAction === "preview"
      ? "미리보기 준비 중..."
      : previewMissingLabels.length > 0
        ? "확인 후 미리보기"
        : hasUnsavedChanges
          ? "저장 후 미리보기"
          : "미리보기";
  const previewHintMessage =
    pendingAction === "preview"
      ? "변경사항을 저장한 뒤 미리보기 화면으로 이동하고 있습니다."
      : previewMissingLabels.length > 0
        ? `미리보기 전 ${previewMissingLabels.join(", ")} 확인을 권장합니다.`
        : hasUnsavedChanges
          ? "현재 변경사항을 먼저 저장한 뒤 미리보기로 이동합니다."
          : "이미 저장된 상태입니다. 바로 미리보기로 이동할 수 있습니다.";
  const previewReadinessLabel =
    previewMissingLabels.length > 0 ? "확인 필요" : "검수 완료";
  const previewReadinessToneClass =
    previewMissingLabels.length > 0
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-green-200 bg-green-50 text-green-700";
  const isMailSending = mailState === "sending";
  const mailStatusLabel =
    mailState === "success"
      ? "발송 완료"
      : mailState === "error"
        ? "발송 실패"
        : mailState === "sending"
          ? "발송 중"
          : "발송 대기";
  const mailStatusToneClass =
    mailState === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : mailState === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : mailState === "sending"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-white text-slate-500";

  return (
    <SiteWorkspaceShell
      site={site}
      activeSection="estimate"
      currentLabel="견적"
      activeLink="estimate"
      title="견적서 작성"
      description="현장 단위로 견적 초안을 편집하고 저장합니다."
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
      onSave={() => {
        void saveNow();
      }}
      actions={
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => {
              void handleOpenPreview();
            }}
            disabled={isEstimateNavigationPending}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {previewButtonLabel}
          </button>
          <p className="text-right text-xs text-slate-500">
            {previewHintMessage}
          </p>
        </div>
      }
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {isInitialEntry ? (
          <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-slate-700">
            <div className="font-medium text-slate-900">첫 견적 작성 중입니다.</div>
            <p className="mt-1 leading-6 text-slate-600">
              아직 저장된 견적 버전이 없습니다. 아래 기본 초안을 작성한 뒤 저장하면
              첫 견적 버전으로 등록됩니다.
            </p>
          </div>
        ) : null}

        {estimates.length > 0 ? (
          <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-5">
            <span className="mr-2 text-sm font-medium text-slate-500">
              견적 버전
            </span>
            <button
              type="button"
              onClick={() => {
                void createNextEstimate();
              }}
              disabled={isEstimateNavigationPending}
              className="rounded-full border border-green-600 bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAction === "create" ? "새 견적 생성 중..." : "새 견적 생성"}
            </button>
            {estimates.map((estimate) => {
              const isActive = estimate.id === currentEstimateId;

              return (
                <button
                  type="button"
                  key={estimate.id}
                  onClick={() => {
                    void handleSelectEstimate(estimate.id);
                  }}
                  disabled={isActive || isEstimateNavigationPending}
                  className={`rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{estimate.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {estimate.version}차
                    </span>
                    {isActive ? (
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white">
                        선택됨
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={`mt-1 font-mono text-[11px] ${
                      isActive ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {estimate.id}
                  </div>
                </button>
              );
            })}
            <div className="mt-3 grid w-full gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_180px]">
              <div className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-3 text-sm text-white">
                <div className="text-slate-300">현재 선택 버전</div>
                <div className="mt-1 font-medium text-white">
                  {currentEstimate?.name ?? "기본 견적"}
                </div>
                <div className="mt-2 inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
                  {currentEstimateVersionLabel}
                </div>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
                <div className="text-slate-500">현재 estimateId</div>
                <div className="mt-2 inline-flex max-w-full rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-900">
                  <span className="break-all">{currentEstimateDisplayId}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <div className="text-slate-500">버전 상태</div>
                <div className="mt-1 font-medium text-slate-900">
                  {isCurrentEstimateLatest ? "최신 버전" : "이전 버전"}
                </div>
              </div>
            </div>
            <p className="mt-3 w-full text-sm text-slate-500">
              버전을 바꾸거나 미리보기로 이동하면 현재 작성 내용이 먼저 저장됩니다.
            </p>
            <div
              className={`mt-3 flex w-full flex-wrap items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${saveStatusToneClass}`}
            >
              <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold">
                {saveStatusLabel}
              </span>
              <span>{saveStatusDetail}</span>
            </div>
            <div className="mt-3 grid w-full gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm">
                <div className="text-slate-500">미리보기 대상</div>
                <div className="mt-1 font-medium text-slate-900">
                  {currentEstimate?.name ?? "기본 견적"}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {currentEstimateVersionLabel}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {draft.vat ? "VAT 포함" : "VAT 별도"}
                  </span>
                </div>
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                  {currentEstimateDisplayId}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-slate-500">최종 검수</div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${previewReadinessToneClass}`}
                  >
                    {previewReadinessLabel}
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>합계 금액</span>
                    <span className="font-semibold text-slate-900">
                      {totals.total.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>부가세 적용</span>
                    <span className="font-medium text-slate-900">
                      {draft.vat ? "포함" : "별도"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>입력된 항목</span>
                    <span className="font-medium text-slate-900">
                      {namedItemCount}개
                    </span>
                  </div>
                </div>
                <div
                  className={`mt-3 rounded-xl border px-3 py-2 text-xs ${previewReadinessToneClass}`}
                >
                  {previewMissingLabels.length > 0
                    ? `확인 필요: ${previewMissingLabels.join(", ")}`
                    : "제목, 견적일, 고객명, 입력 항목 확인이 완료되었습니다."}
                </div>
              </div>
            </div>
            <div className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {estimateChangeSummary && previousEstimate ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="font-medium text-slate-900">
                    {previousEstimate.name} 대비
                  </span>
                  <span>추가된 항목 {estimateChangeSummary.addedCount}개</span>
                  <span>삭제된 항목 {estimateChangeSummary.removedCount}개</span>
                  <span>금액 변경 항목 {estimateChangeSummary.changedCount}개</span>
                </div>
              ) : (
                <span>비교할 이전 버전이 없습니다.</span>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              견적 기본 정보
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              고객 정보와 현장에 연결된 고객 마스터를 기준으로 자동 반영됩니다.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            마지막 저장 시각: {lastSavedAt ?? "-"}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <section className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#fcfcfd_0%,#f8fafc_100%)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Customer
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                  고객 정보
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  현장의 <code>customerId</code>를 기준으로 불러온 정보입니다.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                문서 자동 반영
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Name
                </div>
                <div className="mt-2 text-sm font-medium text-slate-900">
                  {customerName}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Phone
                </div>
                <div className="mt-2 text-sm font-medium text-slate-900">
                  {customerPhone}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Email
                </div>
                <div className="mt-2 truncate text-sm font-medium text-slate-900">
                  {customerEmail}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">발송 상태</div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${mailStatusToneClass}`}
              >
                {mailStatusLabel}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              현재 선택된 견적의 PDF를 첨부해 이메일로 발송합니다.
            </p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <div className="font-medium text-slate-900">
                {currentEstimate?.name ?? "기본 견적"} / {currentEstimateVersionLabel}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                첨부 파일명 {(draft.title || "견적서").trim() || "견적서"}.pdf
              </div>
            </div>
            <label className="mt-4 block text-sm text-slate-700">
              <span className="mb-2 block font-medium">수신 이메일</span>
              <input
                type="email"
                value={mailRecipient}
                onChange={(event) => {
                  setMailRecipient(event.target.value);
                  if (mailState !== "idle") {
                    setMailState("idle");
                    setMailMessage("");
                  }
                }}
                placeholder="email@example.com"
                disabled={isMailSending}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                void sendEmail();
              }}
              disabled={isMailSending}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              {isMailSending ? "PDF 이메일 발송 중..." : "PDF 이메일 발송"}
            </button>
            <p className="mt-2 text-xs text-slate-500">
              {isMailSending
                ? "발송 중에는 중복 요청을 막기 위해 버튼이 비활성화됩니다."
                : "발송 전에 수신 이메일과 PDF 첨부 상태를 확인합니다."}
            </p>
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${mailStatusToneClass}`}
            >
              {mailMessage ||
                (mailRecipient
                  ? `발송 대상 이메일 ${mailRecipient}`
                  : "수신 이메일을 입력하면 현재 견적 PDF를 발송할 수 있습니다.")}
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            <span className="mb-2 block font-medium">견적서 제목</span>
            <input
              className="w-full rounded-xl border border-slate-200 p-3 text-lg font-semibold"
              value={draft.title}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="견적서 제목"
            />
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-2 block font-medium">견적일</span>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 p-3"
              value={draft.estimateDate}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  estimateDate: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <label className="mt-4 block text-sm text-slate-700">
          <span className="mb-2 block font-medium">비고</span>
          <textarea
            className="min-h-28 w-full rounded-xl border border-slate-200 p-3"
            value={draft.note}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                note: event.target.value,
              }))
            }
            placeholder="고객에게 전달할 메모나 추가 설명을 입력하세요."
          />
        </label>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={draft.vat}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                vat: event.target.checked,
              }))
            }
          />
          부가세 적용
        </label>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">품목 / 항목</h2>
            <p className="mt-1 text-sm text-slate-500">
              품목과 항목을 편집하면 수량 x 단가 = 금액 계산이 자동으로 반영됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={addCategory}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
          >
            + 품목 추가
          </button>
        </div>

        <div className="space-y-5">
          {draft.categories.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              <div>
                <div className="font-medium text-slate-700">
                  등록된 품목이 없습니다.
                </div>
                <p className="mt-1">
                  첫 품목을 추가하면 기본 항목 1개가 함께 생성되어 바로 입력을
                  시작할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={addCategory}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                첫 품목 추가
              </button>
            </div>
          ) : null}

          {draft.categories.map((category) => (
            <section
              key={category.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-3 font-semibold"
                  value={category.name}
                  onChange={(event) =>
                    updateCategory(category.id, (currentCategory) => ({
                      ...currentCategory,
                      name: event.target.value,
                    }))
                  }
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addItem(category.id)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    + 항목 추가
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateCategory(category.id)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    품목 복사
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveCategory(category.id, category.name)
                    }
                    className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    품목 삭제
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {category.items.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                    <div>
                      <div className="font-medium text-slate-700">
                        등록된 항목이 없습니다.
                      </div>
                      <p className="mt-1 text-slate-500">
                        첫 항목을 추가하면 수량과 단가를 바로 입력할 수 있습니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addItem(category.id)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      첫 항목 추가
                    </button>
                  </div>
                ) : null}

                {category.items.length > 0 ? (
                  <div className="hidden px-1 pb-1 md:grid md:grid-cols-[2fr_100px_160px_160px_220px] md:gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <span>항목명</span>
                    <span>수량</span>
                    <span>단가</span>
                    <span className="text-right">금액</span>
                    <span className="text-center">동작</span>
                  </div>
                ) : null}

                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-2 md:grid-cols-[2fr_100px_160px_160px_220px]"
                  >
                    <input
                      className="rounded-xl border border-slate-200 bg-white p-3"
                      placeholder="항목명"
                      value={item.name}
                      onChange={(event) =>
                        updateItem(category.id, item.id, (currentItem) => ({
                          ...currentItem,
                          name: event.target.value,
                        }))
                      }
                    />
                    <input
                      type="number"
                      min="0"
                      className="rounded-xl border border-slate-200 bg-white p-3"
                      value={item.qty}
                      onChange={(event) =>
                        updateItem(category.id, item.id, (currentItem) => ({
                          ...currentItem,
                          qty: Number(event.target.value),
                        }))
                      }
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      className="rounded-xl border border-slate-200 bg-white p-3"
                      value={
                        editingPrices[item.id] ??
                        formatPriceInput(String(item.price))
                      }
                      onFocus={(event) => {
                        if (
                          (
                            editingPrices[item.id] ??
                            formatPriceInput(String(item.price))
                          ) === "0"
                        ) {
                          event.target.select();
                        }
                      }}
                      onChange={(event) => {
                          const nextValue = event.target.value;
                          const formattedValue = formatPriceInput(nextValue);

                          setEditingPrices((current) => ({
                            ...current,
                            [item.id]: formattedValue,
                          }));

                          const parsedValue = parsePriceInput(nextValue);

                          if (parsedValue === null) {
                            return;
                          }

                          updateItem(category.id, item.id, (currentItem) => ({
                            ...currentItem,
                            price: parsedValue,
                          }));
                        }}
                      onBlur={(event) => {
                        const nextValue = event.target.value;
                        const parsedValue = parsePriceInput(nextValue);

                        setEditingPrices((current) => {
                          const next = { ...current };
                          delete next[item.id];
                          return next;
                        });

                        updateItem(category.id, item.id, (currentItem) => ({
                          ...currentItem,
                          price: parsedValue ?? 0,
                        }));
                      }}
                    />
                    <div className="flex items-center justify-end rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-900">
                      {calcItem(item.qty, item.price).toLocaleString()}원
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => duplicateItem(category.id, item.id)}
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        항목 복사
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveItem(category.id, item.id, item.name)
                        }
                        className="flex-1 rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        항목 삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-right text-sm font-semibold text-slate-700">
                품목 합계 {calcCategory(category.items).toLocaleString()}원
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
        <h2 className="text-lg font-semibold">총액 요약</h2>
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
      </div>

      <div aria-hidden="true" style={HIDDEN_PDF_CAPTURE_STYLE}>
        <div ref={pdfCaptureRef} style={PDF_CAPTURE_COLOR_STYLE}>
          <EstimateDocument draft={draft} site={site} />
        </div>
      </div>
    </SiteWorkspaceShell>
  );
}

