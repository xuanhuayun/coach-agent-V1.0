import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { singaporeTodayYmd } from "@/lib/singapore-date";
import { SessionHistoryPanel } from "./SessionHistoryPanel";

export async function SessionsHistorySection({
  initialMonthKey,
}: {
  initialMonthKey: string;
}) {
  const lang = await getLang();
  const d = dict[lang];
  const todayYmd = singaporeTodayYmd();
  const currentMonthKey = todayYmd.slice(0, 7);
  const startMonthKey =
    initialMonthKey && /^\d{4}-\d{2}$/.test(initialMonthKey) ? initialMonthKey : currentMonthKey;

  return (
    <SessionHistoryPanel
      lang={lang}
      title={d.sessions_history_title}
      hint={d.sessions_filter_hint}
      startMonthKey={startMonthKey}
      currentMonthKey={currentMonthKey}
      rangeLabel={d.sessions_filter_active}
      emptyMonthText={
        lang === "zh"
          ? "这个月还没有记录～左右滑动看看其他月份，或先去上面记一节！"
          : "No classes logged this month."
      }
      detailLabel={lang === "zh" ? "详情" : "View"}
    />
  );
}
