import type { Lang } from "@/lib/i18n";
import { formatSgdFromCents } from "@/lib/money";

export type RecentPaymentRow = {
  key: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  sessionDate: string;
  timeText: string;
  feeText: string;
  paid: boolean;
};

type SessionSnapshot = {
  id?: string;
  session_date?: string;
  next_booking_at?: string | null;
  next_booking_duration_hours?: number | null;
  duration_hours?: number | null;
  price_cents?: number | null;
  content?: string | null;
  lesson_modes?: { default_price_cents?: number | null } | null;
};

type LinkRow = {
  paid?: boolean | null;
  students?: { id?: string; name?: string } | { id?: string; name?: string }[] | null;
  sessions?: SessionSnapshot | SessionSnapshot[] | null;
};

function unwrapSession(sessions: LinkRow["sessions"]): SessionSnapshot | null {
  if (sessions == null) return null;
  return Array.isArray(sessions) ? (sessions[0] ?? null) : sessions;
}

function unwrapStudent(students: LinkRow["students"]) {
  if (students == null) return null;
  return Array.isArray(students) ? (students[0] ?? null) : students;
}

export function mapRecentPaymentRows(
  links: readonly unknown[],
  lang: Lang,
  options?: { loggedOnly?: boolean },
): RecentPaymentRow[] {
  const loc = lang === "zh" ? "zh-CN" : "en-SG";

  return links
    .map((raw) => {
      const row = raw as LinkRow;
      const session = unwrapSession(row.sessions);
      const student = unwrapStudent(row.students);
      const sessionId = session?.id;
      const studentId = student?.id;
      const studentName = student?.name;
      const sessionDate = session?.session_date;
      if (!sessionId || !studentId || !studentName || !sessionDate) return null;

      if (options?.loggedOnly) {
        const content = session.content;
        if (content == null || String(content).trim().length === 0) return null;
      }

      const at = session.next_booking_at ? new Date(String(session.next_booking_at)) : null;
      const hours =
        typeof session.next_booking_duration_hours === "number"
          ? session.next_booking_duration_hours
          : Number(session.next_booking_duration_hours ?? session.duration_hours ?? 2);

      const end =
        at && Number.isFinite(hours)
          ? new Date(at.getTime() + (hours > 0 ? hours : 2) * 3600_000)
          : null;
      const timeText =
        at && end
          ? `${sessionDate} ${at.toLocaleTimeString(loc, {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}—${end.toLocaleTimeString(loc, {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}`
          : sessionDate;

      const mode = Array.isArray(session.lesson_modes)
        ? (session.lesson_modes[0] ?? null)
        : session.lesson_modes;
      const perPersonCents =
        (session.price_cents as number | null | undefined) ??
        (mode?.default_price_cents as number | null | undefined) ??
        0;

      return {
        key: `${sessionId}:${studentId}`,
        sessionId,
        studentId,
        studentName,
        sessionDate,
        timeText,
        feeText: formatSgdFromCents(perPersonCents),
        paid: Boolean(row.paid ?? false),
      };
    })
    .filter((row): row is RecentPaymentRow => row != null);
}
