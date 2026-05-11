import type { SupabaseClient } from "@supabase/supabase-js";

export function isPgRestMissingColumn(error: unknown, column: string) {
  const code = String((error as { code?: string })?.code ?? "");
  const message = String((error as { message?: string })?.message ?? "");
  if (!message.includes(column)) return false;
  return (
    code === "PGRST204" ||
    code === "42703" ||
    message.includes(`'${column}'`) ||
    message.includes(`"${column}"`)
  );
}

const SESSION_HISTORY_SELECT =
  "id,session_date,content,next_booking_at,price_cents,duration_hours, venues(name,address), lesson_modes(code,label,default_price_cents,default_duration_hours)";
const SESSION_HISTORY_SELECT_COMPAT =
  "id,session_date,content,next_booking_at,price_cents, venues(name,address), lesson_modes(code,label,default_price_cents)";

const SESSION_REVENUE_SELECT =
  "id,session_date,price_cents,duration_hours,venue_id,lesson_mode_id, venues(name), lesson_modes(code,label,default_price_cents,default_duration_hours)";
const SESSION_REVENUE_SELECT_COMPAT =
  "id,session_date,price_cents,venue_id,lesson_mode_id, venues(name), lesson_modes(code,label,default_price_cents)";

export type SessionHistoryRow = {
  id: string;
  session_date: string;
  content?: string | null;
  next_booking_at?: string | null;
  price_cents?: number | null;
  duration_hours?: number | null;
  venues?: { name?: string; address?: string | null } | null;
  lesson_modes?: {
    code?: string;
    label?: string;
    default_price_cents?: number;
    default_duration_hours?: number | null;
  } | null;
};

export type SessionRevenueRow = {
  id: string;
  session_date: string;
  price_cents?: number | null;
  duration_hours?: number | null;
  venue_id?: string | null;
  lesson_mode_id?: string | null;
  venues?: { name?: string } | null;
  lesson_modes?: {
    code?: string;
    label?: string;
    default_price_cents?: number;
    default_duration_hours?: number | null;
  } | null;
};

export type SessionDetailRow = {
  id: string;
  session_date: string;
  content?: string | null;
  improvements?: string | null;
  remarks?: string | null;
  next_booking_at?: string | null;
  next_booking_duration_hours?: number | null;
  price_cents?: number | null;
  duration_hours?: number | null;
  venues?: { name?: string; address?: string | null } | null;
  lesson_modes?: {
    code?: string;
    label?: string;
    default_price_cents?: number;
    default_duration_hours?: number | null;
  } | null;
};

const SESSION_DETAIL_BASE_SELECT =
  "id,session_date,content,improvements,remarks,next_booking_at,price_cents, venues(name,address), lesson_modes(code,label,default_price_cents,default_duration_hours)";
const SESSION_DETAIL_OPTIONAL_COLUMNS = [
  "duration_hours",
  "next_booking_duration_hours",
] as const;

function buildSessionDetailSelect(extras: readonly string[]) {
  return [...extras, SESSION_DETAIL_BASE_SELECT].join(",");
}

async function queryWithDurationFallback<T>(
  run: (select: string) => PromiseLike<{ data: unknown; error: unknown }>,
  fullSelect: string,
  compatSelect: string,
): Promise<T[]> {
  let result = await run(fullSelect);
  if (result.error && isPgRestMissingColumn(result.error, "duration_hours")) {
    result = await run(compatSelect);
  }
  return Array.isArray(result.data) ? (result.data as T[]) : [];
}

export function isLoggedSessionHistoryRow(row: SessionHistoryRow): boolean {
  // Bookings from /bookings keep next_booking_at and no price snapshot until logged.
  if (row.next_booking_at != null && row.price_cents == null) {
    return false;
  }
  return true;
}

export async function querySessionHistory(
  supabase: SupabaseClient,
  opts: { fromStr?: string; toStr?: string; loggedOnly?: boolean },
): Promise<SessionHistoryRow[]> {
  const rows = await queryWithDurationFallback<SessionHistoryRow>(
    async (select) => {
      let q = supabase
        .from("sessions")
        .select(select)
        .order("session_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (opts.fromStr) q = q.gte("session_date", opts.fromStr);
      if (opts.toStr) q = q.lte("session_date", opts.toStr);
      return q;
    },
    SESSION_HISTORY_SELECT,
    SESSION_HISTORY_SELECT_COMPAT,
  );
  if (!opts.loggedOnly) return rows;
  return rows.filter(isLoggedSessionHistoryRow);
}

export async function queryRevenueSessions(
  supabase: SupabaseClient,
  opts: { fromStr: string; toStr: string },
): Promise<SessionRevenueRow[]> {
  return queryWithDurationFallback<SessionRevenueRow>(
    async (select) =>
      supabase
        .from("sessions")
        .select(select)
        .gte("session_date", opts.fromStr)
        .lte("session_date", opts.toStr)
        .order("session_date", { ascending: false }),
    SESSION_REVENUE_SELECT,
    SESSION_REVENUE_SELECT_COMPAT,
  );
}

export async function querySessionsOnDate(
  supabase: SupabaseClient,
  sessionDate: string,
): Promise<SessionRevenueRow[]> {
  return queryWithDurationFallback<SessionRevenueRow>(
    async (select) => supabase.from("sessions").select(select).eq("session_date", sessionDate),
    SESSION_REVENUE_SELECT,
    SESSION_REVENUE_SELECT_COMPAT,
  );
}

export type SessionStudentLinkRow = {
  student_id: string;
  improvements?: string | null;
  students?: { id: string; name: string } | { id: string; name: string }[] | null;
};

export function studentFromSessionStudentRow(
  row: Pick<SessionStudentLinkRow, "students">,
): { id: string; name: string } | null {
  const st = row.students;
  if (Array.isArray(st)) {
    const first = st[0];
    if (!first?.id || !first?.name) return null;
    return { id: String(first.id), name: String(first.name) };
  }
  if (st?.id && st?.name) {
    return { id: String(st.id), name: String(st.name) };
  }
  return null;
}

export async function querySessionStudentLinks(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<SessionStudentLinkRow[]> {
  const withImprovements = await supabase
    .from("session_students")
    .select("student_id,improvements, students(id,name)")
    .eq("session_id", sessionId);
  if (
    !withImprovements.error ||
    !isPgRestMissingColumn(withImprovements.error, "improvements")
  ) {
    return (withImprovements.data as SessionStudentLinkRow[] | null) ?? [];
  }
  const basic = await supabase
    .from("session_students")
    .select("student_id, students(id,name)")
    .eq("session_id", sessionId);
  return (basic.data as SessionStudentLinkRow[] | null) ?? [];
}

export async function querySessionById(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<SessionDetailRow | null> {
  let extras = [...SESSION_DETAIL_OPTIONAL_COLUMNS];
  while (true) {
    const select = buildSessionDetailSelect(extras);
    const result = await supabase.from("sessions").select(select).eq("id", sessionId).single();
    if (!result.error) {
      return (result.data as unknown as SessionDetailRow | null) ?? null;
    }
    const missing = extras.find((column) => isPgRestMissingColumn(result.error, column));
    if (!missing) return null;
    extras = extras.filter((column) => column !== missing);
  }
}

export async function querySessionsByIds(
  supabase: SupabaseClient,
  sessionIds: string[],
): Promise<SessionHistoryRow[]> {
  if (sessionIds.length === 0) return [];
  return queryWithDurationFallback<SessionHistoryRow>(
    async (select) =>
      supabase
        .from("sessions")
        .select(select)
        .in("id", sessionIds)
        .order("session_date", { ascending: false })
        .order("id", { ascending: false }),
    SESSION_HISTORY_SELECT,
    SESSION_HISTORY_SELECT_COMPAT,
  );
}

export async function querySessionDurationIds(
  supabase: SupabaseClient,
  opts: { fromStr: string; toStr: string },
) {
  const withDuration = await supabase
    .from("sessions")
    .select("id,duration_hours")
    .gte("session_date", opts.fromStr)
    .lte("session_date", opts.toStr);
  if (!withDuration.error || !isPgRestMissingColumn(withDuration.error, "duration_hours")) {
    return withDuration.data ?? [];
  }
  const idsOnly = await supabase
    .from("sessions")
    .select("id")
    .gte("session_date", opts.fromStr)
    .lte("session_date", opts.toStr);
  return idsOnly.data ?? [];
}
