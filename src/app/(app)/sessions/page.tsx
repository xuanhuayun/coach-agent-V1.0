import { addDays, addMonths, format, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { dict, type Lang } from "@/lib/i18n";
import { sessionDurationHours } from "@/lib/lesson";
import { querySessionHistory } from "@/lib/session-queries";
import { singaporeTodayBoundsUtcIso, singaporeTodayYmd } from "@/lib/singapore-date";
import { SessionHistoryByMonth, type SessionHistoryMonth } from "./SessionHistoryByMonth";
import { sortLessonModes } from "@/lib/lesson-mode";
import { ensureLessonModes, listLessonModes } from "@/lib/lesson-modes-server";
import { RecentPaymentsClient } from "@/components/RecentPaymentsClient";
import {
  fetchOverdueUnpaidPaymentRows,
  fetchRecentSessionPaymentRows,
} from "@/lib/recent-session-payments";
import { SessionHistoryListRow } from "@/components/SessionHistoryListRow";
import { SessionLogPanel } from "./SessionLogPanel";

function monthKeyFromYmd(ymd: string) {
  return String(ymd).slice(0, 7);
}

function monthLabel(key: string, lang: Lang) {
  const [y, m] = key.split("-").map((part) => Number(part));
  if (lang === "zh") return `${y}年${m}月`;
  return format(parseISO(`${key}-01`), "MMMM yyyy", { locale: enUS });
}

function enumerateMonthKeys(startKey: string, endKey: string) {
  const keys: string[] = [];
  let cur = parseISO(`${startKey}-01`);
  const end = parseISO(`${endKey}-01`);
  while (cur <= end) {
    keys.push(format(cur, "yyyy-MM"));
    cur = addMonths(cur, 1);
  }
  return keys;
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  await ensureLessonModes(supabase, user.id);
  const lang = await getLang();
  const d = dict[lang];
  const todayYmd = singaporeTodayYmd();
  const todayMonth = todayYmd.slice(0, 7);
  const initialMonthKey =
    sp.month && /^\d{4}-\d{2}$/.test(sp.month.trim()) ? sp.month.trim() : todayMonth;

  const [{ data: venues }, modesRaw, { data: students }] = await Promise.all([
    supabase.from("venues").select("id,name").order("created_at", { ascending: false }),
    listLessonModes(supabase),
    supabase.from("students").select("id,name").order("created_at", { ascending: false }),
  ]);
  const modes = sortLessonModes(modesRaw);

  const { startIso, endIso } = singaporeTodayBoundsUtcIso();
  let pendingBooked: any[] = [];
  const pb1 = await supabase
    .from("sessions")
    .select("id,next_booking_at,next_booking_duration_hours, venues(name), lesson_modes(code,label)")
    .gte("next_booking_at", startIso)
    .lt("next_booking_at", endIso)
    .is("content", null)
    .order("next_booking_at", { ascending: true });
  if (!pb1.error) {
    pendingBooked = pb1.data ?? [];
  } else {
    const pb2 = await supabase
      .from("sessions")
      .select("id,next_booking_at, venues(name), lesson_modes(code,label)")
      .gte("next_booking_at", startIso)
      .lt("next_booking_at", endIso)
      .is("content", null)
      .order("next_booking_at", { ascending: true });
    pendingBooked = pb2.data ?? [];
  }

  const pendingIds = (pendingBooked ?? []).map((s: any) => s.id);
  const { data: pendingLinks } =
    pendingIds.length > 0
      ? await supabase
          .from("session_students")
          .select("session_id, students(id,name)")
          .in("session_id", pendingIds)
      : { data: [] as any[] };
  const from3 = format(addDays(parseISO(todayYmd), -2), "yyyy-MM-dd");
  const [overduePaymentRows, recentPaymentRows] = await Promise.all([
    fetchOverdueUnpaidPaymentRows(supabase, lang, user.id, { beforeYmd: from3 }),
    fetchRecentSessionPaymentRows(supabase, lang, user.id, {
      fromYmd: from3,
      toYmd: todayYmd,
    }),
  ]);

  const pendingBySession = new Map<string, { id: string; name: string }[]>();
  (pendingLinks ?? []).forEach((r: any) => {
    const sid = r.session_id as string | undefined;
    const st = r.students;
    if (!sid || !st?.id || !st?.name) return;
    const list = pendingBySession.get(sid) ?? [];
    list.push({ id: st.id, name: st.name });
    pendingBySession.set(sid, list);
  });

  const sessions = await querySessionHistory(supabase, {
    toStr: todayYmd,
    loggedOnly: true,
  });

  const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);
  const { data: ss } =
    sessionIds.length > 0
      ? await supabase
          .from("session_students")
          .select("session_id, students(name)")
          .in("session_id", sessionIds)
      : { data: [] as { session_id: string; students: { name: string } | null }[] };

  const studentsBySession = new Map<string, { name: string }[]>();
  (ss ?? []).forEach((r) => {
    const st = r.students;
    const name = (Array.isArray(st) ? st[0]?.name : st?.name)?.trim();
    if (!name) return;
    const list = studentsBySession.get(r.session_id) ?? [];
    list.push({ name });
    studentsBySession.set(r.session_id, list);
  });

  const oldestMonth =
    (sessions ?? []).length > 0
      ? (sessions ?? []).reduce((min, s) => {
          const key = monthKeyFromYmd(s.session_date);
          return key < min ? key : min;
        }, todayMonth)
      : todayMonth;
  const monthKeys = enumerateMonthKeys(oldestMonth, todayMonth);
  const sessionsByMonth = new Map<string, SessionHistoryMonth["sessions"]>();
  for (const key of monthKeys) {
    sessionsByMonth.set(key, []);
  }
  for (const s of sessions ?? []) {
    const key = monthKeyFromYmd(s.session_date);
    const list = sessionsByMonth.get(key);
    if (!list) continue;
    const mode = s.lesson_modes;
    const modeCode = mode?.code ?? (lang === "zh" ? "—" : "—");
    const linkedStudents = studentsBySession.get(s.id) ?? [];
    const perPersonCents = s.price_cents ?? mode?.default_price_cents ?? 0;
    list.push({
      id: s.id,
      sessionDate: s.session_date,
      modeCode,
      durationHours: sessionDurationHours(s),
      studentNames: linkedStudents.map((student) => student.name),
      classRevenueCents: perPersonCents * linkedStudents.length,
    });
  }
  const historyMonths: SessionHistoryMonth[] = monthKeys.map((key) => {
    const list = sessionsByMonth.get(key) ?? [];
    list.sort((a, b) => {
      const byDate = b.sessionDate.localeCompare(a.sessionDate);
      return byDate !== 0 ? byDate : b.id.localeCompare(a.id);
    });
    return {
      key,
      label: monthLabel(key, lang),
      sessions: list,
    };
  });

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

      {(pendingBooked ?? []).length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              {lang === "zh" ? "今日已约 · 待记录" : "Booked today · To log"}
            </h2>
            <div className="text-xs text-slate-500">
              {lang === "zh"
                ? `共 ${(pendingBooked ?? []).length} 节`
                : `${(pendingBooked ?? []).length} classes`}
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {(pendingBooked ?? []).map((s: any) => {
                const sessionDate = String(s.next_booking_at);
                const modeCode = s.lesson_modes?.code ?? (lang === "zh" ? "—" : "—");
                const durationHours = sessionDurationHours({
                  duration_hours: s.next_booking_duration_hours,
                  lesson_modes: s.lesson_modes,
                });
                const studentNames = (pendingBySession.get(s.id) ?? []).map((p) => p.name);
                return (
                  <li key={s.id}>
                    <SessionHistoryListRow
                      lang={lang}
                      href={`/sessions/log/${s.id}`}
                      sessionDate={sessionDate}
                      modeCode={modeCode}
                      durationHours={durationHours}
                      studentNames={studentNames}
                      detailLabel={lang === "zh" ? "去记录 →" : "Log →"}
                    />
                  </li>
                );
              })}
            </ul>
          </div>        </section>
      ) : null}

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

      <SessionLogPanel
        lang={lang}
        venues={venues ?? []}
        modes={modes ?? []}
        students={(students ?? []).map((s: any) => ({ id: s.id, name: s.name }))}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{d.sessions_history_title}</h2>
          <p className="mt-1 text-xs text-slate-500">{d.sessions_filter_hint}</p>
        </div>

        <SessionHistoryByMonth
          lang={lang}
          months={historyMonths}
          initialMonthKey={initialMonthKey}
          rangeLabel={d.sessions_filter_active}
          emptyMonthText={
            lang === "zh"
              ? "这个月还没有记录～左右滑动看看其他月份，或先去上面记一节！"
              : "No classes logged this month."
          }
          emptyAllText={
            lang === "zh"
              ? "还没有历史记录～先去上面记一节吧！"
              : "No class history yet."
          }
          detailLabel={lang === "zh" ? "详情 →" : "View →"}
        />
      </section>
    </div>
  );
}
