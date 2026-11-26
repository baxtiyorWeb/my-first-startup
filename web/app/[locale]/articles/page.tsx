import type { Metadata } from "next";
import { EditorialListView } from "@/components/seo/editorial-list-view";
import {
  generateEditorialListMetadata,
  resolveEditorialListPageData,
} from "@/lib/seo/editorial-route-helper";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateEditorialListMetadata(locale, "article");
}

export default async function ArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; q?: string; tag?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const data = await resolveEditorialListPageData(locale, sp, "article");

  return (
    <EditorialListView
      kind="article"
      locale={data.typedLocale}
      items={data.items}
      total={data.total}
      page={data.page}
      limit={data.limit}
      activeCategory={data.activeCategory}
      activeSearch={data.activeSearch}
      activeTag={data.activeTag}
    />
  );
}
