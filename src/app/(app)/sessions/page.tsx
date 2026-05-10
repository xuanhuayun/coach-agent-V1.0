import Link from "next/link";
import { format, parseISO } from "date-fns";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { sessionDurationHours } from "@/lib/lesson";
import { singaporeTodayBoundsUtcIso } from "@/lib/singapore-date";
import { SessionLogPanel } from "./SessionLogPanel";

function parseYmd(s: string | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return null;
  const d = parseISO(s.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const lang = await getLang();
  const d = dict[lang];

  const fromRaw = sp.from?.trim() ?? "";
  const toRaw = sp.to?.trim() ?? "";
  const fromD = fromRaw ? parseYmd(fromRaw) : null;
  const toD = toRaw ? parseYmd(toRaw) : null;
  let fromStr = fromD ? format(fromD, "yyyy-MM-dd") : "";
  let toStr = toD ? format(toD, "yyyy-MM-dd") : "";
  if (fromD && toD && fromD > toD) {
    [fromStr, toStr] = [toStr, fromStr];
  }

  const [{ data: venues }, { data: modes }, { data: students }] = await Promise.all([
    supabase.from("venues").select("id,name").order("created_at", { ascending: false }),
    supabase
      .from("lesson_modes")
      .select("id,code,label,default_price_cents")
      .order("code", { ascending: true }),
    supabase.from("students").select("id,name").order("created_at", { ascending: false }),
  ]);

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
  const pendingBySession = new Map<string, { id: string; name: string }[]>();
  (pendingLinks ?? []).forEach((r: any) => {
    const sid = r.session_id as string | undefined;
    const st = r.students;
    if (!sid || !st?.id || !st?.name) return;
    const list = pendingBySession.get(sid) ?? [];
    list.push({ id: st.id, name: st.name });
    pendingBySession.set(sid, list);
  });

  let sessionsQuery = supabase
    .from("sessions")
    .select(
      "id,session_date,content,price_cents,duration_hours, venues(name,address), lesson_modes(code,label,default_price_cents)",
    )
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (fromStr) sessionsQuery = sessionsQuery.gte("session_date", fromStr);
  if (toStr) sessionsQuery = sessionsQuery.lte("session_date", toStr);

  const { data: sessions } = await sessionsQuery;

  const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);
  const { data: ss } =
    sessionIds.length > 0
      ? await supabase
          .from("session_students")
          .select("session_id")
          .in("session_id", sessionIds)
      : { data: [] as { session_id: string }[] };

  const headcount = new Map<string, number>();
  (ss ?? []).forEach((r) => {
    headcount.set(r.session_id, (headcount.get(r.session_id) ?? 0) + 1);
  });

  const filterSummary =
    fromStr || toStr
      ? `${fromStr || "…"} — ${toStr || "…"}`
      : lang === "zh"
        ? "全部"
        : "All";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          {d.nav_session_list}
        </h1>
        <p className="mt-2 text-sm text-slate-600/90">
          {lang === "zh"
            ? "随手记一节课：今天教了什么、谁来上、哪里上。越常记录，复盘越轻松。"
            : "Log a class here, then browse history below with optional date filters."}
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
          <div className="space-y-2">
            {(pendingBooked ?? []).map((s: any) => {
              const start = new Date(s.next_booking_at);
              const end = new Date(
                start.getTime() +
                  (Number(s.next_booking_duration_hours ?? 2) || 2) * 3600_000,
              );
              const venueText =
                s.venues?.name ?? (lang === "zh" ? "（未填场地）" : "(No venue)");
              const modeText = s.lesson_modes
                ? `${s.lesson_modes.code} · ${s.lesson_modes.label}`
                : lang === "zh"
                  ? "（未填模式）"
                  : "(No mode)";
              const who = pendingBySession.get(s.id) ?? [];
              return (
                <Link
                  key={s.id}
                  href={`/sessions/log/${s.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {start.toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-SG", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                        {" — "}
                        {end.toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-SG", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                      <div className="mt-1 text-sm text-slate-800/90">
                        {venueText} · {modeText}
                      </div>
                      {who.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {who.map((p) => (
                            <span
                              key={p.id}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800"
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs font-medium text-cyan-700">
                      {lang === "zh" ? "去记录 →" : "Log →"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <SessionLogPanel
        lang={lang}
        venues={venues ?? []}
        modes={modes ?? []}
        students={(students ?? []).map((s: any) => ({ id: s.id, name: s.name }))}
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {d.sessions_history_title}
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {d.sessions_filter_active}:{" "}
            <span className="font-medium text-slate-700">{filterSummary}</span>
          </p>
        </div>

        <form
          action="/sessions"
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600">
              {d.sessions_filter_from}
            </label>
            <input
              type="date"
              name="from"
              defaultValue={fromStr || ""}
              className="mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              {d.sessions_filter_to}
            </label>
            <input
              type="date"
              name="to"
              defaultValue={toStr || ""}
              className="mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-bold leading-none text-slate-700 shadow-sm hover:bg-slate-50"
            aria-label={d.sessions_filter_apply}
            title={d.sessions_filter_apply}
          >
            🔍
            <span className="sr-only">{d.sessions_filter_apply}</span>
          </button>
          {(fromStr || toStr) && (
            <Link
              href="/sessions"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-bold leading-none text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label={d.sessions_filter_clear}
              title={d.sessions_filter_clear}
            >
              ×
              <span className="sr-only">{d.sessions_filter_clear}</span>
            </Link>
          )}
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {(sessions ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600/90">
              {lang === "zh"
                ? "这个区间里还没找到记录～换个时间试试，或先去上面记一节！"
                : "No classes match this filter."}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(sessions ?? []).map((s: any) => {
                const mode = s.lesson_modes;
                const venue = s.venues;
                const hc = headcount.get(s.id) ?? 0;
                const modeText = mode
                  ? `${mode.code} · ${mode.label}`
                  : lang === "zh"
                    ? "（未填模式）"
                    : "(No mode)";
                const venueText =
                  venue?.name ?? (lang === "zh" ? "（未填场地）" : "(No venue)");
                const snippet = s.content
                  ? String(s.content).slice(0, 80) +
                    (String(s.content).length > 80 ? "…" : "")
                  : null;

                return (
                  <li key={s.id}>
                    <Link
                      href={`/sessions/${s.id}`}
                      className="block p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">
                            {s.session_date}
                          </div>
                          <div className="mt-1 text-sm text-slate-800/90">{modeText}</div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {lang === "zh" ? "场地" : "Venue"}: {venueText}
                            {venue?.address ? ` · ${venue.address}` : ""}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {lang === "zh" ? "到课" : "Present"}: {hc}{" "}
                            {lang === "zh" ? "人" : "students"} ·{" "}
                            {sessionDurationHours(s)}h
                          </div>
                          {snippet && (
                            <p className="mt-2 line-clamp-2 text-xs text-slate-700/80">
                              {snippet}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs font-medium text-cyan-700">
                          {lang === "zh" ? "详情 →" : "View →"}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
