import { SessionHistoryListRow } from "@/components/SessionHistoryListRow";
import { sessionDurationHours } from "@/lib/lesson";
import {
  fetchPendingBookedSessions,
  splitPendingBookedSessions,
  type PendingBookedSession,
} from "@/lib/pending-booked-sessions";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";

async function fetchPendingStudentsBySession(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], sessionIds: string[]) {
  if (sessionIds.length === 0) return new Map<string, string[]>();

  const { data: pendingLinks } = await supabase
    .from("session_students")
    .select("session_id, students(id,name)")
    .in("session_id", sessionIds);

  const pendingBySession = new Map<string, string[]>();
  (pendingLinks ?? []).forEach((row: { session_id?: string; students?: { name?: string } | { name?: string }[] | null }) => {
    const sessionId = row.session_id;
    const student = Array.isArray(row.students) ? row.students[0] : row.students;
    if (!sessionId || !student?.name) return;
    const list = pendingBySession.get(sessionId) ?? [];
    list.push(student.name);
    pendingBySession.set(sessionId, list);
  });

  return pendingBySession;
}

function PendingBookedList({
  lang,
  sessions,
  studentsBySession,
}: {
  lang: "zh" | "en";
  sessions: PendingBookedSession[];
  studentsBySession: Map<string, string[]>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <ul className="divide-y divide-slate-100">
        {sessions.map((session) => {
          const sessionDate = String(session.next_booking_at);
          const modeCode = session.lesson_modes?.code ?? "—";
          const durationHours = sessionDurationHours({
            duration_hours: session.next_booking_duration_hours,
            lesson_modes: session.lesson_modes,
          });
          const studentNames = studentsBySession.get(session.id) ?? [];
          return (
            <li key={session.id}>
              <SessionHistoryListRow
                lang={lang}
                href={`/sessions/log/${session.id}`}
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
  );
}

function PendingBookedSection({
  lang,
  title,
  sessions,
  studentsBySession,
}: {
  lang: "zh" | "en";
  title: string;
  sessions: PendingBookedSession[];
  studentsBySession: Map<string, string[]>;
}) {
  if (sessions.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <div className="text-xs text-slate-500">
          {lang === "zh" ? `共 ${sessions.length} 节` : `${sessions.length} classes`}
        </div>
      </div>
      <PendingBookedList lang={lang} sessions={sessions} studentsBySession={studentsBySession} />
    </section>
  );
}

export async function SessionsPendingSection() {
  const { supabase } = await requireUser();
  const lang = await getLang();
  const pendingBooked = await fetchPendingBookedSessions(supabase);
  const { today, history } = splitPendingBookedSessions(pendingBooked);

  if (today.length === 0 && history.length === 0) return null;

  const sessionIds = [...today, ...history].map((session) => session.id);
  const studentsBySession = await fetchPendingStudentsBySession(supabase, sessionIds);

  return (
    <div className="space-y-6">
      <PendingBookedSection
        lang={lang}
        title={lang === "zh" ? "今日已约 · 待记录" : "Booked today · To log"}
        sessions={today}
        studentsBySession={studentsBySession}
      />
      <PendingBookedSection
        lang={lang}
        title={lang === "zh" ? "历史已约 · 待记录" : "Past bookings · To log"}
        sessions={history}
        studentsBySession={studentsBySession}
      />
    </div>
  );
}
