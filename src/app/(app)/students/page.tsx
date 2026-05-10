import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { singaporeTodayYmd } from "@/lib/singapore-date";
import { computeAttendanceFlags } from "@/lib/student-activity";
import { StudentsListClient } from "./StudentsListClient";

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

export default async function StudentsPage() {
  const { supabase } = await requireUser();
  const lang = await getLang();
  const d = dict[lang];
  const todayYmd = singaporeTodayYmd();

  const [studentsRes, linksRes] = await Promise.all([
    supabase
      .from("students")
      .select("id,name,phone,notes,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("session_students")
      .select("student_id, sessions:session_id(session_date)")
      .order("session_date", { foreignTable: "sessions", ascending: false }),
  ]);

  const students = studentsRes.data ?? [];

  const links = linksRes.data ?? [];

  const agg = new Map<
    string,
    { countPast: number; lastPast: string | null; nextFuture: string | null }
  >();
  for (const row of links) {
    const parsed = sessionDateFromLink(row as { student_id: string; sessions: unknown });
    if (!parsed) continue;
    const { student_id: sid, session_date: sd } = parsed;
    const cur = agg.get(sid) ?? { countPast: 0, lastPast: null, nextFuture: null };
    if (sd <= todayYmd) {
      cur.countPast += 1;
      if (!cur.lastPast || sd > cur.lastPast) cur.lastPast = sd;
    } else {
      if (!cur.nextFuture || sd < cur.nextFuture) cur.nextFuture = sd;
    }
    agg.set(sid, cur);
  }

  const rows = students.map((s: any) => {
    const a = agg.get(s.id);
    const lastPastSessionDate = a?.lastPast ?? null;
    const nextFutureSessionDate = a?.nextFuture ?? null;
    const sessionCount = a?.countPast ?? 0;
    const flags = computeAttendanceFlags(lastPastSessionDate, nextFutureSessionDate, todayYmd);
    return {
      id: s.id,
      name: s.name,
      phone: s.phone ?? null,
      notes: s.notes ?? null,
      sessionCount,
      lastSessionDate: lastPastSessionDate,
      past10: flags.past10,
      past20: flags.past20,
      future10: flags.future10,
      future20: flags.future20,
      isDormant: flags.isDormant,
    };
  });

  return <StudentsListClient lang={lang} copy={d} students={rows} />;
}
