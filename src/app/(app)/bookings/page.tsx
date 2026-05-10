import Link from "next/link";
import { addDays, parseISO, format } from "date-fns";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { singaporeDayBoundsUtcIso, singaporeTodayYmd } from "@/lib/singapore-date";
import { BookingPanel } from "./BookingPanel";
import { RecentPaymentsClient } from "./RecentPaymentsClient";
import { createBooking } from "./actions";

type BookingSession = {
  id: string;
  next_booking_at: string;
  next_booking_duration_hours: number;
  venues: { name: string | null } | null;
  lesson_modes: { code: string; label: string } | null;
  content: string | null;
  remarks: string | null;
};

export default async function BookingsTodayPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const lang = await getLang();
  const d = dict[lang] as any;

  const todayYmd = singaporeTodayYmd();
  const selectedYmd =
    typeof sp.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.day.trim()) ? sp.day.trim() : todayYmd;

  const [{ data: venues }, { data: modes }, { data: students }] = await Promise.all([
    supabase.from("venues").select("id,name").order("created_at", { ascending: false }),
    supabase
      .from("lesson_modes")
      .select("id,code,label,default_price_cents")
      .order("code", { ascending: true }),
    supabase.from("students").select("id,name").order("created_at", { ascending: false }),
  ]);

  const { startIso, endIso } = singaporeDayBoundsUtcIso(selectedYmd);

  let sessions: any[] = [];
  const q1 = await supabase
    .from("sessions")
    .select(
      "id,next_booking_at,next_booking_duration_hours,content,remarks, venues(name), lesson_modes(code,label)",
    )
    .gte("next_booking_at", startIso)
    .lt("next_booking_at", endIso)
    .order("next_booking_at", { ascending: true });
  if (!q1.error) {
    sessions = q1.data ?? [];
  } else {
    const q2 = await supabase
      .from("sessions")
      .select("id,next_booking_at,content,remarks, venues(name), lesson_modes(code,label)")
      .gte("next_booking_at", startIso)
      .lt("next_booking_at", endIso)
      .order("next_booking_at", { ascending: true });
    sessions = q2.data ?? [];
  }

  const bookingSessions = (sessions ?? []) as any as BookingSession[];
  const sessionIds = bookingSessions.map((s) => s.id);

  let links: any[] = [];
  if (sessionIds.length > 0) {
    // Backward-compatible fallback across schema variants.
    const q1 = await supabase
      .from("session_students")
      .select("session_id,student_id,paid,improvements, students(id,name)")
      .in("session_id", sessionIds);
    if (!q1.error) {
      links = q1.data ?? [];
    } else {
      const q2 = await supabase
        .from("session_students")
        .select("session_id,student_id,improvements, students(id,name)")
        .in("session_id", sessionIds);
      if (!q2.error) {
        links = q2.data ?? [];
      } else {
        const q3 = await supabase
          .from("session_students")
          .select("session_id,student_id, students(id,name)")
          .in("session_id", sessionIds);
        links = q3.data ?? [];
      }
    }
  }

  const bySession = new Map<
    string,
    { id: string; name: string }[]
  >();
  (links ?? []).forEach((l: any) => {
    const list = bySession.get(l.session_id) ?? [];
    list.push({
      id: l.students?.id,
      name: l.students?.name,
    });
    bySession.set(l.session_id, list);
  });

  const from3 = format(addDays(parseISO(todayYmd), -2), "yyyy-MM-dd");
  const { data: recentLinks } = await supabase
    .from("session_students")
    .select(
      "student_id, paid, students(id,name), sessions:session_id(id,session_date,next_booking_at,next_booking_duration_hours,price_cents, lesson_modes(default_price_cents))",
    )
    .gte("sessions.session_date", from3)
    .lte("sessions.session_date", todayYmd)
    .order("session_date", { foreignTable: "sessions", ascending: false });

  // Fallback if `paid` column doesn't exist yet.
  const recentLinksSafe =
    recentLinks ??
    (await supabase
      .from("session_students")
      .select(
        "student_id, students(id,name), sessions:session_id(id,session_date,next_booking_at,next_booking_duration_hours,price_cents, lesson_modes(default_price_cents))",
      )
      .gte("sessions.session_date", from3)
      .lte("sessions.session_date", todayYmd)
      .order("session_date", { foreignTable: "sessions", ascending: false })).data ??
    [];

  const recentByStudent = new Map<string, { id: string; name: string; lastDate: string }>();
  (recentLinksSafe ?? []).forEach((r: any) => {
    const id = r.students?.id as string | undefined;
    const name = r.students?.name as string | undefined;
    const date = (Array.isArray(r.sessions) ? r.sessions[0]?.session_date : r.sessions?.session_date) as
      | string
      | undefined;
    if (!id || !name || !date) return;
    if (recentByStudent.has(id)) return;
    recentByStudent.set(id, { id, name, lastDate: date });
  });
  const recentStudents = Array.from(recentByStudent.values());

  const recentPaymentRows = (recentLinksSafe ?? [])
    .map((r: any) => {
      const s = Array.isArray(r.sessions) ? r.sessions[0] : r.sessions;
      const sid = s?.id as string | undefined;
      const studentId = r.students?.id as string | undefined;
      const studentName = r.students?.name as string | undefined;
      const sessionDate = s?.session_date as string | undefined;
      if (!sid || !studentId || !studentName || !sessionDate) return null;
      const at = s?.next_booking_at ? new Date(String(s.next_booking_at)) : null;
      const hours =
        typeof s?.next_booking_duration_hours === "number"
          ? s.next_booking_duration_hours
          : Number(s?.next_booking_duration_hours ?? 2);
      const end = at ? new Date(at.getTime() + (Number.isFinite(hours) ? hours : 2) * 3600_000) : null;
      const loc = lang === "zh" ? "zh-CN" : "en-SG";
      const timeText =
        at && end
          ? `${sessionDate} ${at.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit", hour12: false })}—${end.toLocaleTimeString(
              loc,
              { hour: "2-digit", minute: "2-digit", hour12: false },
            )}`
          : sessionDate;

      const perPersonCents =
        (s?.price_cents as number | null | undefined) ??
        (s?.lesson_modes?.default_price_cents as number | null | undefined) ??
        0;
      const feeText = `S$${Math.round(perPersonCents / 100)}`;
      return {
        key: `${sid}:${studentId}`,
        sessionId: sid,
        studentId,
        studentName,
        timeText,
        feeText,
        paid: Boolean((r as any).paid ?? false),
      };
    })
    .filter(Boolean) as any[];

  // Future bookings list (from tomorrow, Singapore calendar).
  const tomorrowYmd = format(addDays(parseISO(todayYmd), 1), "yyyy-MM-dd");
  const tomorrowStartIso = singaporeDayBoundsUtcIso(tomorrowYmd).startIso;
  let futureSessions: any[] = [];
  const f1 = await supabase
    .from("sessions")
    .select("id,next_booking_at,next_booking_duration_hours,content,remarks, venues(name), lesson_modes(code,label)")
    .gte("next_booking_at", tomorrowStartIso)
    .order("next_booking_at", { ascending: true });
  if (!f1.error) {
    futureSessions = f1.data ?? [];
  } else {
    const f2 = await supabase
      .from("sessions")
      .select("id,next_booking_at,content,remarks, venues(name), lesson_modes(code,label)")
      .gte("next_booking_at", tomorrowStartIso)
      .order("next_booking_at", { ascending: true });
    futureSessions = f2.data ?? [];
  }
  const futureIds = futureSessions.map((s: any) => s.id);
  let futureLinks: any[] = [];
  if (futureIds.length > 0) {
    const l1 = await supabase
      .from("session_students")
      .select("session_id, students(id,name)")
      .in("session_id", futureIds);
    futureLinks = l1.data ?? [];
  }
  const futureBySession = new Map<string, { id: string; name: string }[]>();
  futureLinks.forEach((l: any) => {
    const sid = l.session_id as string | undefined;
    const st = l.students;
    if (!sid || !st?.id || !st?.name) return;
    const list = futureBySession.get(sid) ?? [];
    list.push({ id: st.id, name: st.name });
    futureBySession.set(sid, list);
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          {d.nav_bookings}
        </h1>
        <Link
          href="/sessions"
          className="text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          {lang === "zh" ? "去记一节课" : "Log class"}
        </Link>
      </div>

      <RecentPaymentsClient
        title={lang === "zh" ? "过去三天 · 收款清单" : "Last 3 days · Payments"}
        rows={recentPaymentRows}
      />

      {bookingSessions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600/90">
          {selectedYmd === todayYmd ? d.bookings_empty : lang === "zh" ? "这一天没有约课。" : "No bookings that day."}
        </div>
      ) : (
        <div className="space-y-3">
          {bookingSessions.map((s) => {
            const start = new Date(s.next_booking_at);
            const end = new Date(
              start.getTime() + (Number(s.next_booking_duration_hours ?? 2) || 2) * 3600_000,
            );
            const who = (bySession.get(s.id) ?? []).filter((x) => x.id && x.name);
            const modeText = s.lesson_modes
              ? `${s.lesson_modes.code} · ${s.lesson_modes.label}`
              : lang === "zh"
                ? "（未填模式）"
                : "(No mode)";
            const venueText =
              s.venues?.name ??
              (lang === "zh" ? "（未填场地）" : "(No venue)");

            return (
              <div
                key={s.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={`/bookings/${s.id}`}
                    className="text-sm font-semibold text-slate-900 hover:underline"
                  >
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
                    <span
                      className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600"
                      aria-label={lang === "zh" ? "编辑" : "Edit"}
                      title={lang === "zh" ? "编辑" : "Edit"}
                    >
                      ✎
                    </span>
                  </Link>
                  <div className="text-sm text-slate-700">
                    {venueText} · {modeText}
                  </div>
                </div>

                {who.length > 0 ? (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {who.map((p) => (
                        <Link
                          key={p.id}
                          href={`/students/${p.id}`}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100"
                        >
                          {p.name}
                        </Link>
                      ))}
                    </div>
                    {s.remarks ? (
                      <div className="mt-2 text-sm text-slate-700">
                        <span className="text-xs font-semibold text-slate-500">
                          {lang === "zh" ? "备注" : "Notes"}：
                        </span>{" "}
                        {s.remarks}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-slate-600/90">
                    {lang === "zh" ? "未关联学员。" : "No students linked."}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      <BookingPanel
        lang={lang}
        venues={venues ?? []}
        modes={modes ?? []}
        students={(students ?? []).map((s: any) => ({ id: s.id, name: s.name }))}
        recentStudents={recentStudents}
        action={createBooking}
      />

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-sm font-semibold text-slate-900">
            {lang === "zh" ? "未来已约课程" : "Future bookings"}
          </div>
        </div>
        {futureSessions.length === 0 ? (
          <div className="text-sm text-slate-600/90">
            {lang === "zh" ? "未来还没有约课。" : "No future bookings."}
          </div>
        ) : (
          <div className="space-y-2">
            {futureSessions.map((s: any) => {
              const start = new Date(s.next_booking_at);
              const end = new Date(start.getTime() + (Number(s.next_booking_duration_hours ?? 2) || 2) * 3600_000);
              const venueText = s.venues?.name ?? (lang === "zh" ? "（未填场地）" : "(No venue)");
              const who = (futureBySession.get(s.id) ?? []).filter((x) => x.id && x.name);
              return (
                <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/bookings/${s.id}`}
                      className="text-sm font-semibold text-slate-900 hover:underline"
                    >
                      {format(start, "yyyy-MM-dd")}{" "}
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
                      <span
                        className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600"
                        aria-label={lang === "zh" ? "编辑" : "Edit"}
                        title={lang === "zh" ? "编辑" : "Edit"}
                      >
                        ✎
                      </span>
                    </Link>
                    <div className="text-sm text-slate-700">{venueText}</div>
                  </div>
                  {who.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
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
                  {s.remarks ? (
                    <div className="mt-2 text-sm text-slate-700">
                      <span className="text-xs font-semibold text-slate-500">
                        {lang === "zh" ? "备注" : "Notes"}：
                      </span>{" "}
                      {s.remarks}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

