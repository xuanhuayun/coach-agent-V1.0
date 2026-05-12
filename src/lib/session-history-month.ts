import { endOfMonth, format, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lang } from "@/lib/i18n";
import { sessionDurationHours } from "@/lib/lesson";
import { querySessionHistory } from "@/lib/session-queries";
import { singaporeTodayYmd } from "@/lib/singapore-date";

export type SessionHistoryListItem = {
  id: string;
  sessionDate: string;
  modeCode: string;
  durationHours: number;
  studentNames: string[];
  classRevenueCents: number;
};

export type SessionHistoryMonthPayload = {
  key: string;
  label: string;
  sessions: SessionHistoryListItem[];
};

export function sessionHistoryMonthLabel(key: string, lang: Lang): string {
  const [y, m] = key.split("-").map((part) => Number(part));
  if (lang === "zh") return `${y}年${m}月`;
  return format(parseISO(`${key}-01`), "MMMM yyyy", { locale: enUS });
}

export function createSessionHistoryMonthPlaceholder(
  monthKey: string,
  lang: Lang,
): SessionHistoryMonthPayload {
  return {
    key: monthKey,
    label: sessionHistoryMonthLabel(monthKey, lang),
    sessions: [],
  };
}

export function sessionHistoryMonthBounds(monthKey: string, todayYmd = singaporeTodayYmd()) {
  const fromStr = `${monthKey}-01`;
  const monthEnd = format(endOfMonth(parseISO(fromStr)), "yyyy-MM-dd");
  const toStr = monthEnd > todayYmd ? todayYmd : monthEnd;
  return { fromStr, toStr };
}

export async function buildSessionHistoryMonth(
  supabase: SupabaseClient,
  monthKey: string,
  lang: Lang,
  todayYmd = singaporeTodayYmd(),
): Promise<SessionHistoryMonthPayload> {
  const { fromStr, toStr } = sessionHistoryMonthBounds(monthKey, todayYmd);
  const sessions = await querySessionHistory(supabase, {
    fromStr,
    toStr,
    loggedOnly: true,
  });

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: ss } =
    sessionIds.length > 0
      ? await supabase
          .from("session_students")
          .select("session_id, students(name)")
          .in("session_id", sessionIds)
      : { data: [] as { session_id: string; students: { name: string } | null }[] };

  const studentsBySession = new Map<string, { name: string }[]>();
  (ss ?? []).forEach((r) => {
    const st = r.students;
    const name = (Array.isArray(st) ? st[0]?.name : st?.name)?.trim();
    if (!name) return;
    const list = studentsBySession.get(r.session_id) ?? [];
    list.push({ name });
    studentsBySession.set(r.session_id, list);
  });

  const list: SessionHistoryListItem[] = (sessions ?? []).map((s) => {
    const mode = s.lesson_modes;
    const modeCode = mode?.code ?? (lang === "zh" ? "—" : "—");
    const linkedStudents = studentsBySession.get(s.id) ?? [];
    const perPersonCents = s.price_cents ?? mode?.default_price_cents ?? 0;
    return {
      id: s.id,
      sessionDate: s.session_date,
      modeCode,
      durationHours: sessionDurationHours(s),
      studentNames: linkedStudents.map((student) => student.name),
      classRevenueCents: perPersonCents * linkedStudents.length,
    };
  });

  list.sort((a, b) => {
    const byDate = b.sessionDate.localeCompare(a.sessionDate);
    return byDate !== 0 ? byDate : b.id.localeCompare(a.id);
  });

  return {
    key: monthKey,
    label: sessionHistoryMonthLabel(monthKey, lang),
    sessions: list,
  };
}
