"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import EstimatePreviewPage from "@/features/estimate/components/EstimatePreviewPage";
import { estimateRepository } from "@/repositories/estimateRepository";

export default function Page() {
  const searchParams = useSearchParams();
  const estimateId = searchParams.get("id");

  const estimate = useMemo(() => {
    if (!estimateId) {
      return null;
    }

    return estimateRepository.getById(estimateId);
  }, [estimateId]);

  if (!estimateId || !estimate) {
    return <div className="p-8">Not Found</div>;
  }

  return <EstimatePreviewPage estimateId={estimate.id} />;
}
