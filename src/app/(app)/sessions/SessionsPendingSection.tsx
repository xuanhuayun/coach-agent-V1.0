import { SessionHistoryListRow } from "@/components/SessionHistoryListRow";
import { sessionDurationHours } from "@/lib/lesson";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { singaporeTodayBoundsUtcIso } from "@/lib/singapore-date";

export async function SessionsPendingSection() {
  const { supabase } = await requireUser();
  const lang = await getLang();
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

  if ((pendingBooked ?? []).length === 0) return null;

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

  return (
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
                  rowVariant="booking"
                />
              </li>
            );
          })}
        </ul>
      
      </div>
    </section>
  );
}
