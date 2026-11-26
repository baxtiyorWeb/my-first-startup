import { Suspense } from "react";
import { FeedContainer } from "@/components/feed/feed-container";
import { DashboardRightSidebar } from "@/components/feed/right-sidebar";

export default function DashboardPage() {
  return (
    <div className="w-full flex items-start justify-start gap-6 lg:gap-7">
      {/* 1. Asosiy Yangiliklar Tasmasi (Feed Column — widened and aligned to left) */}
      <section
        aria-labelledby="feed-section-heading"
        className="flex-1 min-w-0 max-w-[860px] 2xl:max-w-[900px]"
      >
        <h2 id="feed-section-heading" className="sr-only">
          Postlar, g‘oyalar va startaplar oqimi
        </h2>
        <Suspense
          fallback={
            <div className="space-y-4 w-full animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 bg-white dark:bg-[#101117] rounded-[17px] border border-slate-200/90 dark:border-[#24252f]"
                />
              ))}
            </div>
          }
        >
          <FeedContainer />
        </Suspense>
      </section>

      {/* 2. O'ng yon panel (Right Sidebar Widgets — Figma node 11:8 & 11:9) */}
      <div className="hidden xl:block w-[320px] 2xl:w-[330px] shrink-0 sticky top-20">
        <DashboardRightSidebar />
      </div>
    </div>
  );
}
