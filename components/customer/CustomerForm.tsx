"use client";

export type CustomerFormValues = {
  name: string;
  phone: string;
  email: string;
  memo: string;
};

type CustomerFormProps = {
  form: CustomerFormValues;
  mode: "create" | "edit";
  isSubmitting: boolean;
  onChange: <K extends keyof CustomerFormValues>(
    key: K,
    value: CustomerFormValues[K]
  ) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export const createEmptyCustomerForm = (): CustomerFormValues => ({
  name: "",
  phone: "",
  email: "",
  memo: "",
});

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

export default function CustomerForm({
  form,
  mode,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Customer Form</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {mode === "create" ? "고객 추가" : "고객 수정"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            고객 기본 정보와 메모를 입력하면 바로 목록에 반영됩니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {mode === "create" ? "신규 등록" : "편집 중"}
        </span>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="text-sm text-slate-700">
          <span className="mb-2 block font-medium">
            고객명 <span className="text-rose-500">*</span>
          </span>
          <input
            className={inputClassName}
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="고객명을 입력하세요"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            <span className="mb-2 block font-medium">전화번호</span>
            <input
              className={inputClassName}
              value={form.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              placeholder="010-0000-0000"
            />
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-2 block font-medium">이메일</span>
            <input
              className={inputClassName}
              value={form.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="name@example.com"
            />
          </label>
        </div>

        <label className="text-sm text-slate-700">
          <span className="mb-2 block font-medium">메모</span>
          <textarea
            className={`${inputClassName} min-h-36 resize-y`}
            value={form.memo}
            onChange={(event) => onChange("memo", event.target.value)}
            placeholder="상담 내용, 선호 사항, 결제 메모 등을 기록하세요"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "처리 중..."
            : mode === "create"
              ? "고객 등록"
              : "변경 저장"}
        </button>
      </div>
    </section>
  );
}
