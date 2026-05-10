import Link from "next/link";
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { dict, type Lang } from "@/lib/i18n";
import { sessionDurationHours } from "@/lib/lesson";
import { InfoTip } from "@/components/InfoTip";
import {
  parseFinancePreset,
  rangeForPreset,
  singaporeCurrentMonthRange,
  singaporeTodayYmd,
  type FinancePreset,
} from "@/lib/singapore-date";
import { RevenueTrendChart, type MonthlyPoint } from "./RevenueTrendChart";

function parseYmd(s: string | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = parseISO(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function clampRange(fromStr: string, toStr: string) {
  let a = parseYmd(fromStr);
  let b = parseYmd(toStr);
  if (!a || !b) return null;
  if (a > b) [a, b] = [b, a];
  return {
    fromStr: format(a, "yyyy-MM-dd"),
    toStr: format(b, "yyyy-MM-dd"),
  };
}

type MonthSlot = { key: string; label: string };

function monthSlotsBetween(fromStr: string, toStr: string, lang: Lang): MonthSlot[] {
  const loc = lang === "zh" ? zhCN : enUS;
  const start = startOfMonth(parseISO(fromStr));
  const end = startOfMonth(parseISO(toStr));
  const out: MonthSlot[] = [];
  let cur = start;
  while (cur <= end) {
    out.push({
      key: format(cur, "yyyy-MM"),
      label:
        lang === "zh"
          ? format(cur, "yyyy年M月", { locale: loc })
          : format(cur, "MMM yyyy", { locale: loc }),
    });
    cur = addMonths(cur, 1);
  }
  return out;
}

type SessionRow = {
  id: string;
  date: string;
  venueName: string;
  modeLabel: string;
  perPersonCents: number;
  headcount: number;
  revenueCents: number;
  durationHours: number;
};

function mapSessionsToRows(
  sessions: any[] | null | undefined,
  ss: any[] | null | undefined,
  lang: Lang,
): SessionRow[] {
  const attendance = new Map<string, number>();
  (ss ?? []).forEach((r: any) => {
    attendance.set(r.session_id, (attendance.get(r.session_id) ?? 0) + 1);
  });
  return (sessions ?? []).map((s: any) => {
    const mode = s.lesson_modes;
    const perPersonCents = s.price_cents ?? mode?.default_price_cents ?? 0;
    const headcount = attendance.get(s.id) ?? 0;
    const revenueCents = perPersonCents * headcount;
    const durationH = sessionDurationHours(s);
    return {
      id: s.id,
      date: s.session_date,
      venueName: s.venues?.name ?? (lang === "zh" ? "（未填场地）" : "(No venue)"),
      modeLabel: mode
        ? `${mode.code} · ${mode.label}`
        : lang === "zh"
          ? "（未填模式）"
          : "(No mode)",
      perPersonCents,
      headcount,
      revenueCents,
      durationHours: durationH,
    };
  });
}

const sessionSelect =
  "id,session_date,price_cents,duration_hours,venue_id,lesson_mode_id, venues(name), lesson_modes(code,label,default_price_cents)";

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const lang = await getLang();
  const d = dict[lang];

  const preset = parseFinancePreset(sp.preset);
  const monthDefault = singaporeCurrentMonthRange();
  let fromStr: string;
  let toStr: string;
  if (preset === "custom") {
    const clamped = clampRange(
      sp.from ?? monthDefault.fromStr,
      sp.to ?? monthDefault.toStr,
    );
    const r = clamped ?? monthDefault;
    fromStr = r.fromStr;
    toStr = r.toStr;
  } else {
    const r = rangeForPreset(preset);
    fromStr = r.fromStr;
    toStr = r.toStr;
  }

  const todayYmd = singaporeTodayYmd();
  const effectiveToStr = toStr > todayYmd ? todayYmd : toStr;

  const [{ data: rangeSessions }, { data: todaySessions }] = await Promise.all([
    supabase
      .from("sessions")
      .select(sessionSelect)
      .gte("session_date", fromStr)
      .lte("session_date", effectiveToStr)
      .order("session_date", { ascending: false }),
    supabase.from("sessions").select(sessionSelect).eq("session_date", todayYmd),
  ]);

  const rangeIds = (rangeSessions ?? []).map((s: { id: string }) => s.id);
  const todayIds = (todaySessions ?? []).map((s: { id: string }) => s.id);
  const allIds = [...new Set([...rangeIds, ...todayIds])];

  const { data: ssAll } =
    allIds.length > 0
      ? await supabase.from("session_students").select("session_id").in("session_id", allIds)
      : { data: [] as { session_id: string }[] };

  const ssForRange = (ssAll ?? []).filter((r) => rangeIds.includes(r.session_id));
  const ssForToday = (ssAll ?? []).filter((r) => todayIds.includes(r.session_id));

  const rows = mapSessionsToRows(rangeSessions, ssForRange, lang);
  const todayRows = mapSessionsToRows(todaySessions, ssForToday, lang);
  const todayCents = todayRows.reduce((acc, r) => acc + r.revenueCents, 0);

  const totalCents = rows.reduce((acc, r) => acc + r.revenueCents, 0);
  const totalHours = rows.reduce((acc, r) => acc + r.durationHours, 0);

  const monthBuckets = new Map<string, { revenueCents: number; hours: number }>();
  for (const r of rows) {
    const key = String(r.date).slice(0, 7);
    const b = monthBuckets.get(key) ?? { revenueCents: 0, hours: 0 };
    b.revenueCents += r.revenueCents;
    b.hours += r.durationHours;
    monthBuckets.set(key, b);
  }

  const slots = monthSlotsBetween(fromStr, toStr, lang);
  const chartData: MonthlyPoint[] = slots.map((m) => {
    const b = monthBuckets.get(m.key);
    return {
      label: m.label,
      revenue: Math.round((b?.revenueCents ?? 0) / 100),
      hours: Math.round((b?.hours ?? 0) * 10) / 10,
    };
  });

  /* Top 5 students by hours this calendar month (Singapore) */
  const { fromStr: topFrom, toStr: topTo } = singaporeCurrentMonthRange();
  const topEffectiveTo = topTo > todayYmd ? todayYmd : topTo;
  const { data: monthSessions } = await supabase
    .from("sessions")
    .select("id,duration_hours")
    .gte("session_date", topFrom)
    .lte("session_date", topEffectiveTo);

  const monthSessIds = (monthSessions ?? []).map((s: { id: string }) => s.id);
  const { data: monthLinks } =
    monthSessIds.length > 0
      ? await supabase
          .from("session_students")
          .select("student_id,session_id")
          .in("session_id", monthSessIds)
      : { data: [] as { student_id: string; session_id: string }[] };

  const hoursBySession = new Map(
    (monthSessions ?? []).map((s: any) => [s.id, sessionDurationHours(s)]),
  );
  const studentHours = new Map<string, number>();
  for (const l of monthLinks ?? []) {
    const h = hoursBySession.get(l.session_id) ?? 0;
    studentHours.set(l.student_id, (studentHours.get(l.student_id) ?? 0) + h);
  }
  const top5 = [...studentHours.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topIds = top5.map(([id]) => id);
  const { data: topStudents } =
    topIds.length > 0
      ? await supabase.from("students").select("id,name").in("id", topIds)
      : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((topStudents ?? []).map((s) => [s.id, s.name]));
  const topRows = top5.map(([id, hours]) => ({
    id,
    name: nameById.get(id) ?? (lang === "zh" ? "学员" : "Student"),
    hours: Math.round(hours * 10) / 10,
  }));

  const presetTabs: { id: FinancePreset; label: string }[] = [
    { id: "month", label: d.finance_preset_month },
    { id: "quarter", label: d.finance_preset_quarter },
    { id: "year", label: d.finance_preset_year },
    { id: "custom", label: d.finance_preset_custom },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">{d.nav_revenue}</h1>
          <InfoTip
            text={
              lang === "zh"
                ? "收入 = 单价（S$/人/节）× 实际到课人数；课时按每节课时长汇总（默认 2 小时）。统计以新加坡时区「今天 / 本月」为准。"
                : "Revenue = per-person rate × attendance; hours sum session lengths (default 2h). “Today / this month” use Asia/Singapore."
            }
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 shadow-sm shadow-slate-200/40">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {d.finance_today_title}
        </div>
        {todayCents > 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-900">
            <span className="font-semibold text-slate-700">{d.finance_today_great}</span>{" "}
            {d.finance_today_amount}
            <span className="text-lg font-bold text-cyan-700">
              {(todayCents / 100).toFixed(0)}
            </span>
            {d.finance_today_tail}
          </p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-slate-800/90">{d.finance_today_zero}</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">{d.finance_period_title}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {presetTabs.map((t) => {
            const active = preset === t.id;
            const href =
              t.id === "custom"
                ? `/revenue?preset=custom&from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`
                : `/revenue?preset=${t.id}`;
            return (
              <Link
                key={t.id}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md shadow-slate-900/12"
                    : "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {preset === "custom" && (
          <form
            action="/revenue"
            method="get"
            className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/90 p-4"
          >
            <input type="hidden" name="preset" value="custom" />
            <div>
              <label className="block text-xs font-medium text-slate-600/90">
                {d.finance_custom_from}
              </label>
              <input
                type="date"
                name="from"
                defaultValue={fromStr}
                className="mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600/90">
                {d.finance_custom_to}
              </label>
              <input
                type="date"
                name="to"
                defaultValue={toStr}
                className="mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-base font-bold leading-none text-emerald-700 shadow-sm hover:bg-emerald-100"
              aria-label={d.finance_apply}
              title={d.finance_apply}
            >
              🔍
              <span className="sr-only">{d.finance_apply}</span>
            </button>
          </form>
        )}

        <p className="mt-3 text-xs text-slate-500">
          {fromStr} — {toStr}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs text-slate-500">{lang === "zh" ? "课次" : "Sessions"}</div>
            <div className="mt-2 text-lg font-semibold tracking-tight">{rows.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs text-slate-500">
            {lang === "zh" ? "区间收入" : "Revenue"}
          </div>
            <div className="mt-2 text-lg font-semibold tracking-tight">
            S${(totalCents / 100).toFixed(0)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs text-slate-500">
            {lang === "zh" ? "上课小时" : "Hours"}
          </div>
            <div className="mt-2 text-lg font-semibold tracking-tight">{totalHours}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs text-slate-500">
            {lang === "zh" ? "当前区间" : "Range"}
          </div>
          <div className="mt-2 text-sm font-medium text-slate-900">
            {presetTabs.find((t) => t.id === preset)?.label ?? preset}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">{d.finance_monthly_trend}</h2>
          <InfoTip text={d.finance_monthly_trend_hint} />
        </div>
        <div className="mt-4">
          <RevenueTrendChart lang={lang} data={chartData} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">{d.finance_top_students}</h2>
          <InfoTip text={d.finance_top_sub} />
        </div>
        {topRows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600/90">{d.finance_no_students_month}</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {topRows.map((r, i) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-100/80 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-cyan-700 shadow-sm">
                    {i + 1}
                  </span>
                  <Link
                    href={`/students/${r.id}`}
                    className="truncate font-medium text-slate-900 hover:underline"
                  >
                    {r.name}
                  </Link>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-slate-900">{r.hours}h</div>
                  <div className="text-xs text-slate-500">{d.finance_top_hours}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
