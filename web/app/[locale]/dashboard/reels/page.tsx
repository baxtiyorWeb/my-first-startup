import { notFound } from "next/navigation";

export default function ReelsRedirectPage() {
  const isProduction = process.env.NODE_ENV === "production";
  const isShortsEnabled = process.env.NEXT_PUBLIC_ENABLE_SHORTS === "true";

  if (isProduction || !isShortsEnabled) {
    notFound();
  }

  return null;
}
