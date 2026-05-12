import type { Lang } from "@/lib/i18n";
import { mapRecentPaymentRows, type RecentPaymentRow } from "@/lib/recent-payment-rows";
import { isPgRestMissingColumn } from "@/lib/session-queries";
import {
  applyPaidMapToRows,
  readSessionStudentPaidMap,
} from "@/lib/session-student-paid-state";

const SESSION_SELECTS = [
  "id,session_date,next_booking_at,next_booking_duration_hours,duration_hours,price_cents,content, lesson_modes(default_price_cents)",
  "id,session_date,next_booking_at,next_booking_duration_hours,price_cents,content, lesson_modes(default_price_cents)",
  "id,session_date,next_booking_at,price_cents,content, lesson_modes(default_price_cents)",
] as const;

async function fetchSessionsInDateRange(
  supabase: any,
  opts: { fromYmd?: string; toYmd?: string; beforeYmd?: string },
): Promise<unknown[]> {
  let sessions: unknown[] = [];
  for (const select of SESSION_SELECTS) {
    let query = supabase.from("sessions").select(select).order("session_date", { ascending: false });
    if (opts.fromYmd) query = query.gte("session_date", opts.fromYmd);
    if (opts.toYmd) query = query.lte("session_date", opts.toYmd);
    if (opts.beforeYmd) query = query.lt("session_date", opts.beforeYmd);
    const result = await query;
    if (!result.error) {
      sessions = result.data ?? [];
      break;
    }
  }
  return sessions;
}

async function fetchSessionStudentLinks(supabase: any, sessionIds: string[]) {
  if (sessionIds.length === 0) return [] as unknown[];

  const withPaid = await supabase
    .from("session_students")
    .select("session_id,student_id,paid, students(id,name)")
    .in("session_id", sessionIds);
  if (!withPaid.error) return withPaid.data ?? [];

  if (isPgRestMissingColumn(withPaid.error, "paid")) {
    const withoutPaid = await supabase
      .from("session_students")
      .select("session_id,student_id, students(id,name)")
      .in("session_id", sessionIds);
    return withoutPaid.data ?? [];
  }

  return withPaid.data ?? [];
}

async function buildPaymentRows(
  supabase: any,
  lang: Lang,
  userId: string,
  opts: { fromYmd?: string; toYmd?: string; beforeYmd?: string },
  options?: { unpaidOnly?: boolean },
): Promise<RecentPaymentRow[]> {
  const sessions = await fetchSessionsInDateRange(supabase, opts);
  const sessionIds = sessions
    .map((row) => String((row as { id?: string }).id ?? "").trim())
    .filter(Boolean);
  if (sessionIds.length === 0) return [];

  const links = await fetchSessionStudentLinks(supabase, sessionIds);
  const sessionById = new Map(
    sessions.map((row) => {
      const session = row as { id?: string };
      return [String(session.id ?? ""), row] as const;
    }),
  );

  const combined = links.map((link: unknown) => {
    const row = link as { session_id?: string };
    const sessionId = String(row.session_id ?? "");
    return {
      ...(link as object),
      sessions: sessionById.get(sessionId) ?? null,
    };
  });

  const paidMap = await readSessionStudentPaidMap(supabase, userId);
  const rows = applyPaidMapToRows(
    mapRecentPaymentRows(combined, lang, { loggedOnly: true }),
    paidMap,
  );
  if (!options?.unpaidOnly) return rows;
  return rows.filter((row) => !row.paid);
}

export async function fetchRecentSessionPaymentRows(
  supabase: any,
  lang: Lang,
  userId: string,
  opts: { fromYmd: string; toYmd: string },
): Promise<RecentPaymentRow[]> {
  return buildPaymentRows(supabase, lang, userId, opts);
}

export async function fetchOverdueUnpaidPaymentRows(
  supabase: any,
  lang: Lang,
  userId: string,
  opts: { beforeYmd: string },
): Promise<RecentPaymentRow[]> {
  return buildPaymentRows(supabase, lang, userId, opts, { unpaidOnly: true });
}
