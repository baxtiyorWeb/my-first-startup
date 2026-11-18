"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

export default function ReelsPage() {
  const router = useRouter();
  const { localePath } = useI18n();

  useEffect(() => {
    router.replace(localePath("/dashboard"));
  }, [router, localePath]);

  return null;
}
