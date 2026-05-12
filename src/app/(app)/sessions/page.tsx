import { Suspense } from "react";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { singaporeTodayYmd } from "@/lib/singapore-date";
import { PanelLoadingFallback, SectionLoadingFallback } from "@/components/loading/PageSkeletons";
import { SessionLogSection } from "./SessionLogSection";
import { SessionsHistorySection } from "./SessionsHistorySection";
import { SessionsPaymentsSection } from "./SessionsPaymentsSection";
import { SessionsPendingSection } from "./SessionsPendingSection";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const lang = await getLang();
  const d = dict[lang];
  const todayMonth = singaporeTodayYmd().slice(0, 7);
  const initialMonthKey =
    sp.month && /^\d{4}-\d{2}$/.test(sp.month.trim()) ? sp.month.trim() : todayMonth;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          {d.nav_session_list}
        </h1>
        <p className="mt-2 text-sm text-slate-600/90">
          {lang === "zh"
            ? "随手记一节课：今天教了什么、谁来上课了。记录完可以在「财务」模块查看收入。"
            : "Log a class: what you taught and who attended. After saving, check revenue in Finance."}
        </p>
      </div>

      <Suspense fallback={<SectionLoadingFallback rows={2} />}>
        <SessionsPendingSection />
      </Suspense>

      <Suspense fallback={<SectionLoadingFallback rows={3} />}>
        <SessionsPaymentsSection />
      </Suspense>

      <Suspense fallback={<PanelLoadingFallback />}>
        <SessionLogSection />
      </Suspense>

      <Suspense fallback={<SectionLoadingFallback rows={4} />}>
        <SessionsHistorySection initialMonthKey={initialMonthKey} />
      </Suspense>
    </div>
  );
}
