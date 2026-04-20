"use client";

import { useEffect, useState } from "react";
import { useSiteStore } from "@/store/site-store";

export default function AppBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrateSites = useSiteStore((state) => state.hydrateSites);
  const hydrated = useSiteStore((state) => state.hydrated);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateSites();
    setReady(true);
  }, [hydrateSites]);

  if (!ready || !hydrated) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] p-8 text-sm text-slate-500">
        데이터를 불러오는 중입니다.
      </div>
    );
  }

  return <>{children}</>;
}
