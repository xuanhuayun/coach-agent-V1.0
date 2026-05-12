import type { SupabaseClient } from "@supabase/supabase-js";
import { computeAttendanceFlags } from "@/lib/student-activity";
import { singaporeTodayYmd } from "@/lib/singapore-date";

export type StudentListRowPayload = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  sessionCount: number;
  lastSessionDate: string | null;
  past10: boolean;
  past20: boolean;
  future10: boolean;
  future20: boolean;
  isDormant: boolean;
};

function sessionDateFromLink(row: {
  student_id: string;
  sessions: unknown;
}): { student_id: string; session_date: string } | null {
  const s = row.sessions;
  if (s == null) return null;
  if (Array.isArray(s)) {
    const d = (s[0] as { session_date?: string } | undefined)?.session_date;
    return d ? { student_id: row.student_id, session_date: d } : null;
  }
  const d = (s as { session_date?: string }).session_date;
  return d ? { student_id: row.student_id, session_date: d } : null;
}

export async function fetchStudentListPage(
  supabase: SupabaseClient,
  opts: { offset: number; limit: number },
  todayYmd = singaporeTodayYmd(),
): Promise<{ students: StudentListRowPayload[]; hasMore: boolean }> {
  const offset = Math.max(0, opts.offset);
  const limit = Math.min(Math.max(1, opts.limit), 50);

  const { data: students, count } = await supabase
    .from("students")
    .select("id,name,phone,notes,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const rows = students ?? [];
  const studentIds = rows.map((s) => s.id);
  if (studentIds.length === 0) {
    return { students: [], hasMore: false };
  }

  const { data: links } = await supabase
    .from("session_students")
    .select("student_id, sessions:session_id(session_date)")
    .in("student_id", studentIds)
    .order("session_date", { foreignTable: "sessions", ascending: false });

  const agg = new Map<
    string,
    { countPast: number; lastPast: string | null; nextFuture: string | null }
  >();
  for (const row of links ?? []) {
    const parsed = sessionDateFromLink(row as { student_id: string; sessions: unknown });
    if (!parsed) continue;
    const { student_id: sid, session_date: sd } = parsed;
    const cur = agg.get(sid) ?? { countPast: 0, lastPast: null, nextFuture: null };
    if (sd <= todayYmd) {
      cur.countPast += 1;
      if (!cur.lastPast || sd > cur.lastPast) cur.lastPast = sd;
    } else if (!cur.nextFuture || sd < cur.nextFuture) {
      cur.nextFuture = sd;
    }
    agg.set(sid, cur);
  }

  const payload = rows.map((s) => {
    const a = agg.get(s.id);
    const lastPastSessionDate = a?.lastPast ?? null;
    const nextFutureSessionDate = a?.nextFuture ?? null;
    const flags = computeAttendanceFlags(lastPastSessionDate, nextFutureSessionDate, todayYmd);
    return {
      id: s.id,
      name: s.name,
      phone: s.phone ?? null,
      notes: s.notes ?? null,
      sessionCount: a?.countPast ?? 0,
      lastSessionDate: lastPastSessionDate,
      past10: flags.past10,
      past20: flags.past20,
      future10: flags.future10,
      future20: flags.future20,
      isDormant: flags.isDormant,
    };
  });

  const total = count ?? payload.length;
  return { students: payload, hasMore: offset + payload.length < total };
}
