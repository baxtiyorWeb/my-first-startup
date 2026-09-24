import { Suspense } from "react";
import { FeedContainer } from "@/components/feed/feed-container";

export default function DashboardPage() {
  return (
    <div className="w-full">
      {/* Pure Social Feed: Content Discovery, Reading, and Interaction */}
      <section aria-labelledby="feed-section-heading">
        <h2 id="feed-section-heading" className="sr-only">
          Fikrlar va intellektual muhokamalar oqimi
        </h2>
        <Suspense
          fallback={
            <div className="space-y-3 w-full animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800"
                />
              ))}
            </div>
          }
        >
          <FeedContainer />
        </Suspense>
      </section>
    </div>
  );
}