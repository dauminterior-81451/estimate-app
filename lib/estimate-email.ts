type EstimateEmailTotals = {
  supply: number;
  vatAmount: number;
  total: number;
};

export type SendEstimateEmailPayload = {
  customerName: string;
  estimateDate: string;
  estimateId?: string;
  note: string;
  pdfBase64?: string;
  pdfFileName?: string;
  previewUrl?: string;
  siteId: string;
  siteName: string;
  title: string;
  to: string;
  totals: EstimateEmailTotals;
};

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const createEstimatePreviewUrl = (
  baseUrl: string | undefined,
  siteId: string,
  estimateId?: string
) => {
  if (!baseUrl) {
    return undefined;
  }

  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;

  const previewPath =
    estimateId && estimateId !== siteId
      ? `/sites/${siteId}/estimate/preview?estimateId=${encodeURIComponent(estimateId)}`
      : `/sites/${siteId}/estimate/preview`;

  return `${normalizedBaseUrl}${previewPath}`;
};

export const createEstimateEmailSubject = ({
  customerName,
  siteName,
  totals,
}: Pick<SendEstimateEmailPayload, "customerName" | "siteName" | "totals">) =>
  `[견적서] ${siteName} / ${customerName} / ${won(totals.total)}`;

export const createEstimateEmailText = ({
  customerName,
  estimateDate,
  note,
  previewUrl,
  siteName,
  title,
  totals,
}: Omit<SendEstimateEmailPayload, "to" | "siteId">) =>
  [
    `${customerName} 고객님, 안녕하세요.`,
    "",
    `${siteName} 현장 견적서를 전달드립니다.`,
    `견적서 제목: ${title}`,
    `견적일: ${estimateDate || "-"}`,
    `공급가액: ${won(totals.supply)}`,
    `부가세: ${won(totals.vatAmount)}`,
    `합계: ${won(totals.total)}`,
    "",
    `비고: ${note || "없음"}`,
    previewUrl ? `미리보기 링크: ${previewUrl}` : "",
    "",
    "감사합니다.",
  ]
    .filter(Boolean)
    .join("\n");

export const createEstimateEmailHtml = ({
  customerName,
  estimateDate,
  note,
  previewUrl,
  siteName,
  title,
  totals,
}: Omit<SendEstimateEmailPayload, "to" | "siteId">) => {
  const safeCustomerName = escapeHtml(customerName || "고객");
  const safeSiteName = escapeHtml(siteName || "-");
  const safeTitle = escapeHtml(title || "견적서");
  const safeEstimateDate = escapeHtml(estimateDate || "-");
  const safeNote = escapeHtml(note || "별도 비고가 없습니다.");
  const safePreviewUrl = previewUrl ? escapeHtml(previewUrl) : "";

  return `
    <div style="margin:0;padding:32px 0;background:#f3f6f9;font-family:'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#0f172a;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
        <div style="padding:32px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
          <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#64748b;font-weight:700;">Estimate</div>
          <h1 style="margin:16px 0 8px;font-size:28px;line-height:1.2;color:#020617;">${safeTitle}</h1>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
            ${safeCustomerName} 고객님, 안녕하세요.<br />
            ${safeSiteName} 현장 견적서를 전달드립니다.
          </p>
        </div>

        <div style="padding:32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:0 0 12px;font-size:14px;color:#64748b;">고객명</td>
              <td style="padding:0 0 12px;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">${safeCustomerName}</td>
            </tr>
            <tr>
              <td style="padding:0 0 12px;font-size:14px;color:#64748b;">현장명</td>
              <td style="padding:0 0 12px;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">${safeSiteName}</td>
            </tr>
            <tr>
              <td style="padding:0 0 12px;font-size:14px;color:#64748b;">견적일</td>
              <td style="padding:0 0 12px;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">${safeEstimateDate}</td>
            </tr>
          </table>

          <div style="border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;margin-bottom:24px;">
            <div style="display:flex;justify-content:space-between;padding:14px 18px;background:#f8fafc;font-size:14px;color:#475569;">
              <span>공급가액</span>
              <strong style="color:#0f172a;">${won(totals.supply)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding:14px 18px;border-top:1px solid #e2e8f0;background:#ffffff;font-size:14px;color:#475569;">
              <span>부가세</span>
              <strong style="color:#0f172a;">${won(totals.vatAmount)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding:18px;background:#0f172a;color:#ffffff;font-size:18px;font-weight:700;">
              <span>합계</span>
              <span>${won(totals.total)}</span>
            </div>
          </div>

          <div style="padding:20px;border-radius:20px;background:#f8fafc;margin-bottom:24px;">
            <div style="font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">Note</div>
            <div style="font-size:14px;line-height:1.7;color:#334155;white-space:pre-wrap;">${safeNote}</div>
          </div>

          ${
            safePreviewUrl
              ? `<a href="${safePreviewUrl}" style="display:inline-block;padding:14px 20px;border-radius:14px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">견적서 미리보기 열기</a>`
              : ""
          }

          <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
            본 메일은 견적 확인용으로 발송되었습니다. 추후 PDF 첨부 또는 고객 전용 열람 링크로 확장할 수 있도록 구성되어 있습니다.
          </p>
        </div>
      </div>
    </div>
  `;
};
