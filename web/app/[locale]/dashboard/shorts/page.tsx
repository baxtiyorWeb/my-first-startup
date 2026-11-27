import { notFound } from "next/navigation";
import ShortsClientView from "./shorts-client-view";

// Web platformada shorts bo'limi vaqtincha yopilgan (faqat mobile ilovada mavjud).
// Productionda va webda ushbu sahifa 404 Not Found qaytaradi.
export default function ShortsPage() {
  const isProduction = process.env.NODE_ENV === "production";
  const isShortsEnabled = process.env.NEXT_PUBLIC_ENABLE_SHORTS === "true";

  if (isProduction || !isShortsEnabled) {
    notFound();
  }

  return <ShortsClientView />;
}
