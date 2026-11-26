import type { Metadata } from "next";
import { EditorialDetailView } from "@/components/seo/editorial-detail-view";
import {
  generateEditorialDetailMetadata,
  resolveEditorialDetailPageData,
} from "@/lib/seo/editorial-route-helper";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  return generateEditorialDetailMetadata(locale, slug, "news");
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const data = await resolveEditorialDetailPageData(locale, slug, "news");

  return (
    <EditorialDetailView
      item={data.item}
      locale={data.typedLocale}
      relatedItems={data.relatedItems}
      matchedTopics={data.matchedTopics}
      matchedGlossary={data.matchedGlossary}
    />
  );
}
