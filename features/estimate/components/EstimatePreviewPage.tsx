"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import EstimateDocument from "@/components/EstimateDocument";
import WorkspaceTopBar from "@/components/WorkspaceTopBar";
import { estimateRepository } from "@/repositories/estimateRepository";
import { useSiteStore } from "@/store/site-store";
import type { EstimateDraft } from "@/types/estimate";

type EstimatePreviewPageProps = {
  estimateId: string;
};

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

export default function EstimatePreviewPage({
  estimateId,
}: EstimatePreviewPageProps) {
  const siteId = estimateRepository.getById(estimateId)?.siteId ?? estimateId;
  const editorHref =
    estimateId === siteId
      ? `/sites/${siteId}/estimate`
      : `/sites/${siteId}/estimate?estimateId=${estimateId}`;
  const site = useSiteStore((state) =>
    state.sites.find((entry) => entry.id === siteId)
  );
  const [draft, setDraft] = useState<EstimateDraft>(
    estimateRepository.createDefault(siteId)
  );
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const estimate = estimateRepository.getById(estimateId);
    const nextSiteId = estimate?.siteId ?? estimateId;
    setDraft(estimate ?? estimateRepository.createDefault(nextSiteId));
    setLoaded(true);
  }, [estimateId]);

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) {
      return;
    }

    const previewElement = previewRef.current;

    if (!previewElement) {
      return;
    }

    setIsDownloadingPdf(true);

    try {
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

      pdf.addImage(
        imageData,
        "PNG",
        margin,
        position,
        printableWidth,
        imageHeight
      );
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
        (draft.title || "견적서").replace(/[\\/:*?"<>|]+/g, "").trim() ||
        "견적서"
      }.pdf`;

      const blob = pdf.output("blob");
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
    } catch (error) {
      console.error("Failed to download estimate PDF", error);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!siteId || !site) {
    return <div className="p-8">존재하지 않거나 삭제된 현장입니다.</div>;
  }

  if (!loaded) {
    return <div className="p-8">견적 문서를 불러오는 중입니다.</div>;
  }

  return (
    <div className="min-h-screen bg-[#eef1f5] px-4 py-6 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-[1120px]">
        <div className="print:hidden">
          <WorkspaceTopBar
            site={site}
            currentLabel="미리보기"
            activeLink="preview"
            saveStatus="saved"
            lastSavedAt={draft.updatedAt}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Estimate Preview
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              견적 미리보기
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              고객 전달용 문서 레이아웃입니다. 아래 문서를 그대로 캡처해 PDF로
              저장합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={editorHref}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              편집으로 돌아가기
            </Link>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              {isDownloadingPdf ? "PDF 생성 중..." : "PDF 다운로드"}
            </button>
          </div>
        </div>

        <div ref={previewRef} style={PDF_CAPTURE_COLOR_STYLE}>
          <EstimateDocument draft={draft} site={site} />
        </div>
      </div>
    </div>
  );
}
