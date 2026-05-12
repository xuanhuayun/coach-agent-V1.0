import { addDays, format, parseISO } from "date-fns";
import { RecentPaymentsClient } from "@/components/RecentPaymentsClient";
import {
  fetchOverdueUnpaidPaymentRows,
  fetchRecentSessionPaymentRows,
} from "@/lib/recent-session-payments";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { singaporeTodayYmd } from "@/lib/singapore-date";

export async function SessionsPaymentsSection() {
  const { supabase, user } = await requireUser();
  const lang = await getLang();
  const todayYmd = singaporeTodayYmd();
  const from3 = format(addDays(parseISO(todayYmd), -2), "yyyy-MM-dd");
  const [overduePaymentRows, recentPaymentRows] = await Promise.all([
    fetchOverdueUnpaidPaymentRows(supabase, lang, user.id, { beforeYmd: from3 }),
    fetchRecentSessionPaymentRows(supabase, lang, user.id, {
      fromYmd: from3,
      toYmd: todayYmd,
    }),
  ]);

  return (
    <>
      {overduePaymentRows.length > 0 ? (
        <RecentPaymentsClient
          lang={lang}
          variant="warning"
          showPaidSection={false}
          title={lang === "zh" ? "超过三天未收费" : "Overdue unpaid"}
          rows={overduePaymentRows}
        />
      ) : null}
      <RecentPaymentsClient
        lang={lang}
        title={lang === "zh" ? "过去三天 · 收款清单" : "Last 3 days · Payments"}
        rows={recentPaymentRows}
      />
    </>
  );
}
