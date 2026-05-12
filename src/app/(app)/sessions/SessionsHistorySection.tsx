import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { buildSessionHistoryMonth } from "@/lib/session-history-month";
import { singaporeTodayYmd } from "@/lib/singapore-date";
import { SessionHistoryByMonth } from "./SessionHistoryByMonth";

export async function SessionsHistorySection({
  initialMonthKey,
}: {
  initialMonthKey: string;
}) {
  const { supabase } = await requireUser();
  const lang = await getLang();
  const d = dict[lang];
  const todayYmd = singaporeTodayYmd();
  const currentMonthKey = todayYmd.slice(0, 7);
  const monthKey =
    initialMonthKey && /^\d{4}-\d{2}$/.test(initialMonthKey) ? initialMonthKey : currentMonthKey;
  const initialMonth = await buildSessionHistoryMonth(supabase, monthKey, lang, todayYmd);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{d.sessions_history_title}</h2>
        <p className="mt-1 text-xs text-slate-500">{d.sessions_filter_hint}</p>
      </div>
      <SessionHistoryByMonth
        lang={lang}
        initialMonth={initialMonth}
        currentMonthKey={currentMonthKey}
        rangeLabel={d.sessions_filter_active}
        emptyMonthText={
          lang === "zh"
            ? "这个月还没有记录～左右滑动看看其他月份，或先去上面记一节！"
            : "No classes logged this month."
        }
        detailLabel={lang === "zh" ? "详情 →" : "View →"}
      />
    </section>
  );
}
