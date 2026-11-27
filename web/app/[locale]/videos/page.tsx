import { notFound, permanentRedirect } from "next/navigation";
import { isValidLocale } from "@/lib/i18n/config";

export default async function VideosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  permanentRedirect(`/${locale}/articles`);
}
