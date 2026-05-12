import { addDays, format, parseISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { singaporeTodayYmd } from "@/lib/singapore-date";

export type BookingSessionRow = {
  id: string;
  next_booking_at: string;
  next_booking_duration_hours?: number | null;
  content?: string | null;
  remarks?: string | null;
  venues?: { name: string | null } | null;
  lesson_modes?: { code: string; label: string; default_duration_hours?: number | null } | null;
};

const DAY_SESSION_SELECT =
  "id,next_booking_at,next_booking_duration_hours,content,remarks, venues(name), lesson_modes(code,label,default_duration_hours)";
const DAY_SESSION_SELECT_COMPAT =
  "id,next_booking_at,content,remarks, venues(name), lesson_modes(code,label)";

async function queryBookingSessions(
  supabase: SupabaseClient,
  opts: { gte: string; lt?: string; orderAsc?: boolean },
): Promise<BookingSessionRow[]> {
  const run = async (select: string) => {
    let query = supabase.from("sessions").select(select).gte("next_booking_at", opts.gte);
    if (opts.lt) query = query.lt("next_booking_at", opts.lt);
    return query.order("next_booking_at", { ascending: opts.orderAsc ?? true });
  };

  const primary = await run(DAY_SESSION_SELECT);
  if (!primary.error) return (primary.data ?? []) as unknown as BookingSessionRow[];

  const fallback = await run(DAY_SESSION_SELECT_COMPAT);
  return (fallback.data ?? []) as unknown as BookingSessionRow[];
}

export async function fetchBookingStudentsBySession(
  supabase: SupabaseClient,
  sessionIds: string[],
): Promise<Map<string, { id: string; name: string }[]>> {
  const bySession = new Map<string, { id: string; name: string }[]>();
  if (sessionIds.length === 0) return bySession;

  const primary = await supabase
    .from("session_students")
    .select("session_id, students(id,name)")
    .in("session_id", sessionIds);
  const links = primary.error
    ? (
        await supabase
          .from("session_students")
          .select("session_id, students(id,name)")
          .in("session_id", sessionIds)
      ).data ?? []
    : primary.data ?? [];

  for (const row of links as { session_id?: string; students?: { id?: string; name?: string } | null }[]) {
    const sid = row.session_id;
    const student = row.students;
    if (!sid || !student?.id || !student?.name) continue;
    const list = bySession.get(sid) ?? [];
    list.push({ id: student.id, name: student.name });
    bySession.set(sid, list);
  }

  return bySession;
}

export async function fetchDayBookings(
  supabase: SupabaseClient,
  startIso: string,
  endIso: string,
) {
  const sessions = await queryBookingSessions(supabase, { gte: startIso, lt: endIso });
  const bySession = await fetchBookingStudentsBySession(
    supabase,
    sessions.map((session) => session.id),
  );
  return { sessions, bySession };
}

export async function fetchFutureBookings(supabase: SupabaseClient, tomorrowStartIso: string) {
  const sessions = await queryBookingSessions(supabase, { gte: tomorrowStartIso });
  const bySession = await fetchBookingStudentsBySession(
    supabase,
    sessions.map((session) => session.id),
  );
  return { sessions, bySession };
}

export async function fetchRecentBookingStudents(
  supabase: SupabaseClient,
  todayYmd = singaporeTodayYmd(),
) {
  const from3 = format(addDays(parseISO(todayYmd), -2), "yyyy-MM-dd");
  const primary = await supabase
    .from("session_students")
    .select("student_id, students(id,name), sessions:session_id(session_date)")
    .gte("sessions.session_date", from3)
    .lte("sessions.session_date", todayYmd)
    .order("session_date", { foreignTable: "sessions", ascending: false });

  const links =
    primary.data ??
    (
      await supabase
        .from("session_students")
        .select("student_id, students(id,name), sessions:session_id(session_date)")
        .gte("sessions.session_date", from3)
        .lte("sessions.session_date", todayYmd)
        .order("session_date", { foreignTable: "sessions", ascending: false })
    ).data ??
    [];

  const recentByStudent = new Map<string, { id: string; name: string; lastDate: string }>();
  for (const row of links as {
    students?: { id?: string; name?: string } | null;
    sessions?: { session_date?: string } | { session_date?: string }[] | null;
  }[]) {
    const id = row.students?.id;
    const name = row.students?.name;
    const session = row.sessions;
    const date = Array.isArray(session) ? session[0]?.session_date : session?.session_date;
    if (!id || !name || !date || recentByStudent.has(id)) continue;
    recentByStudent.set(id, { id, name, lastDate: date });
  }

  return Array.from(recentByStudent.values());
}
