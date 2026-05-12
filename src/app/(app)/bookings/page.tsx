import { Suspense } from "react";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { PanelLoadingFallback, SectionLoadingFallback } from "@/components/loading/PageSkeletons";
import { singaporeTodayYmd } from "@/lib/singapore-date";
import { BookingPanelSection } from "./BookingPanelSection";
import { BookingsFutureSection } from "./BookingsFutureSection";
import { BookingsTodaySection } from "./BookingsTodaySection";

export default async function BookingsTodayPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const sp = await searchParams;
  const lang = await getLang();
  const d = dict[lang] as Record<string, string>;
  const todayYmd = singaporeTodayYmd();
  const selectedYmd =
    typeof sp.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.day.trim()) ? sp.day.trim() : todayYmd;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-slate-900">{d.nav_bookings}</h1>

      <Suspense fallback={<SectionLoadingFallback rows={3} />}>
        <BookingsTodaySection selectedYmd={selectedYmd} todayYmd={todayYmd} />
      </Suspense>

      <Suspense fallback={<PanelLoadingFallback />}>
        <BookingPanelSection />
      </Suspense>

      <Suspense fallback={<SectionLoadingFallback rows={2} />}>
        <BookingsFutureSection />
      </Suspense>
    
    </div>
  );
}
