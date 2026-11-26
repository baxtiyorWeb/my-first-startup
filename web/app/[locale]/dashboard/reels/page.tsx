"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

export default function ReelsRedirectPage() {
  const router = useRouter();
  const { localePath } = useI18n();

  useEffect(() => {
    router.replace(localePath("/dashboard/shorts"));
  }, [router, localePath]);

  return null;
}
