"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { customerRepository } from "@/repositories/customerRepository";
import { useSiteStore } from "@/store/site-store";

export default function NewSitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addSite = useSiteStore((state) => state.addSite);

  useEffect(() => {
    const customerId = searchParams.get("customerId");
    const customer = customerId ? customerRepository.getById(customerId) : null;
    const id = addSite(
      customer
        ? {
            customerId: customer.id,
            customerName: customer.name,
            phone: customer.phone,
            email: customer.email,
          }
        : undefined
    );
    router.replace(`/sites/${id}`);
  }, [addSite, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
      새 현장을 생성하는 중입니다.
    </div>
  );
}
