import Link from "next/link";
import { addDays, parseISO, format } from "date-fns";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { sessionDurationHours } from "@/lib/lesson";
import { singaporeDayBoundsUtcIso, singaporeTodayYmd } from "@/lib/singapore-date";
import { sortLessonModes } from "@/lib/lesson-mode";
import { ensureLessonModes, listLessonModes } from "@/lib/lesson-modes-server";
import { BookingSessionListItem } from "@/components/BookingSessionListItem";
import { BookingPanel } from "./BookingPanel";
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
  const { supabase, user } = await requireUser();
  await ensureLessonModes(supabase, user.id);
  const lang = await getLang();
  const d = dict[lang] as any;

  const todayYmd = singaporeTodayYmd();
  const selectedYmd =
    typeof sp.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.day.trim()) ? sp.day.trim() : todayYmd;

  const [{ data: venues }, modesRaw, { data: students }] = await Promise.all([
    supabase.from("venues").select("id,name").order("created_at", { ascending: false }),
    listLessonModes(supabase),
    supabase.from("students").select("id,name").order("created_at", { ascending: false }),
  ]);
  const modes = sortLessonModes(modesRaw);

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
      <h1 className="text-lg font-semibold tracking-tight text-slate-900">{d.nav_bookings}</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">{d.bookings_today}</h2>
        {bookingSessions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600/90">
          {selectedYmd === todayYmd ? d.bookings_empty : lang === "zh" ? "这一天没有约课。" : "No bookings that day."}
        </div>
      ) : (
        <div className="space-y-3">
          {bookingSessions.map((s) => (
            <BookingSessionListItem
              key={s.id}
              id={s.id}
              nextBookingAt={s.next_booking_at}
              durationHours={sessionDurationHours({
                duration_hours: s.next_booking_duration_hours,
                lesson_modes: s.lesson_modes,
              })}
              venueName={s.venues?.name}
              students={bySession.get(s.id) ?? []}
              remarks={s.remarks}
              lang={lang}
            />
          ))}
        </div>
        )}
      </section>

      <BookingPanel
        lang={lang}
        venues={venues ?? []}
        modes={modes ?? []}
        students={(students ?? []).map((s: any) => ({ id: s.id, name: s.name }))}
        recentStudents={recentStudents}
        action={createBooking}
      />

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          {lang === "zh" ? "未来已约课程" : "Future bookings"}
        </h2>
        {futureSessions.length === 0 ? (
          <div className="text-sm text-slate-600/90">
            {lang === "zh" ? "未来还没有约课。" : "No future bookings."}
          </div>
        ) : (
          <div className="space-y-3">
            {futureSessions.map((s: any) => (
              <BookingSessionListItem
                key={s.id}
                id={s.id}
                nextBookingAt={s.next_booking_at}
                durationHours={sessionDurationHours({
                  duration_hours: s.next_booking_duration_hours,
                  lesson_modes: s.lesson_modes,
                })}
                venueName={s.venues?.name}
                students={futureBySession.get(s.id) ?? []}
                remarks={s.remarks}
                lang={lang}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

