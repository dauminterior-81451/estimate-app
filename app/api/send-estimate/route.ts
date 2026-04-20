import { NextResponse } from "next/server";
import {
  createEstimateEmailHtml,
  createEstimateEmailSubject,
  createEstimateEmailText,
  createEstimatePreviewUrl,
  isValidEmail,
  type SendEstimateEmailPayload,
} from "@/lib/estimate-email";
import { createMailerTransport, getMailFrom } from "@/lib/mailer";

export const runtime = "nodejs";

const createPdfAttachment = (body: SendEstimateEmailPayload) => {
  if (!body.pdfBase64 || !body.pdfFileName) {
    return {
      attachment: null,
      error: "PDF 첨부 파일 정보가 없습니다.",
    };
  }

  const fileName = body.pdfFileName.trim();

  if (!fileName) {
    return {
      attachment: null,
      error: "PDF 파일명이 올바르지 않습니다.",
    };
  }

  const content = Buffer.from(body.pdfBase64, "base64");

  if (content.byteLength === 0) {
    return {
      attachment: null,
      error: "PDF 첨부 파일 생성에 실패했습니다.",
    };
  }

  return {
    attachment: {
      filename: fileName,
      content,
      contentType: "application/pdf",
    },
    error: null,
  };
};

const isValidPayload = (body: unknown): body is SendEstimateEmailPayload => {
  if (!body || typeof body !== "object") {
    return false;
  }

  const payload = body as Record<string, unknown>;
  const totals =
    payload.totals && typeof payload.totals === "object"
      ? (payload.totals as Record<string, unknown>)
      : null;

  return (
    typeof payload.to === "string" &&
    typeof payload.customerName === "string" &&
    typeof payload.siteId === "string" &&
    typeof payload.siteName === "string" &&
    typeof payload.title === "string" &&
    typeof payload.estimateDate === "string" &&
    typeof payload.note === "string" &&
    (typeof payload.estimateId === "string" ||
      typeof payload.estimateId === "undefined") &&
    (typeof payload.pdfBase64 === "string" ||
      typeof payload.pdfBase64 === "undefined") &&
    (typeof payload.pdfFileName === "string" ||
      typeof payload.pdfFileName === "undefined") &&
    (typeof payload.previewUrl === "string" ||
      typeof payload.previewUrl === "undefined") &&
    totals !== null &&
    typeof totals.supply === "number" &&
    typeof totals.vatAmount === "number" &&
    typeof totals.total === "number"
  );
};

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (!isValidPayload(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "이메일 발송 요청 형식이 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(body.to)) {
      return NextResponse.json(
        {
          success: false,
          error: "고객 이메일 형식이 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    const transporter = createMailerTransport();
    const from = getMailFrom();
    const previewUrl =
      body.previewUrl ||
      createEstimatePreviewUrl(
        process.env.APP_BASE_URL,
        body.siteId,
        body.estimateId
      );
    const subject = createEstimateEmailSubject(body).trim();

    if (!body.to.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "수신 이메일이 비어 있습니다.",
        },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        {
          success: false,
          error: "이메일 제목을 생성할 수 없습니다.",
        },
        { status: 400 }
      );
    }

    const { attachment, error: attachmentError } = createPdfAttachment(body);

    if (attachmentError || !attachment) {
      return NextResponse.json(
        {
          success: false,
          error: attachmentError || "PDF 첨부 파일이 없습니다.",
        },
        { status: 400 }
      );
    }

    const html = createEstimateEmailHtml({
      ...body,
      previewUrl,
    });
    const text = createEstimateEmailText({
      ...body,
      previewUrl,
    });
    let info;

    try {
      info = await transporter.sendMail({
        from,
        to: body.to.trim(),
        subject,
        text,
        html,
        attachments: [attachment],
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "메일 서버 발송 처리 중 오류가 발생했습니다.";

      return NextResponse.json(
        {
          success: false,
          error: `메일 서버 발송에 실패했습니다. ${message}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "견적서 이메일을 발송했습니다.",
      messageId: info.messageId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "이메일 발송 중 알 수 없는 오류가 발생했습니다.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
