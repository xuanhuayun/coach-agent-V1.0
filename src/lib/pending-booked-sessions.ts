import type { SupabaseClient } from "@supabase/supabase-js";
import { singaporeTodayBoundsUtcIso } from "@/lib/singapore-date";

export type PendingBookedSession = {
  id: string;
  next_booking_at: string;
  next_booking_duration_hours?: number | null;
  venues?: { name?: string | null } | null;
  lesson_modes?: { code?: string | null; label?: string | null } | null;
};

export async function fetchPendingBookedSessions(
  supabase: SupabaseClient,
): Promise<PendingBookedSession[]> {
  const withDuration = await supabase
    .from("sessions")
    .select("id,next_booking_at,next_booking_duration_hours, venues(name), lesson_modes(code,label)")
    .not("next_booking_at", "is", null)
    .is("content", null)
    .order("next_booking_at", { ascending: true });

  if (!withDuration.error) {
    return (withDuration.data ?? []) as PendingBookedSession[];
  }

  const withoutDuration = await supabase
    .from("sessions")
    .select("id,next_booking_at, venues(name), lesson_modes(code,label)")
    .not("next_booking_at", "is", null)
    .is("content", null)
    .order("next_booking_at", { ascending: true });

  return (withoutDuration.data ?? []) as PendingBookedSession[];
}

export function splitPendingBookedSessions(
  sessions: readonly PendingBookedSession[],
  bounds = singaporeTodayBoundsUtcIso(),
): { today: PendingBookedSession[]; history: PendingBookedSession[] } {
  const startMs = new Date(bounds.startIso).getTime();
  const endMs = new Date(bounds.endIso).getTime();
  const today: PendingBookedSession[] = [];
  const history: PendingBookedSession[] = [];

  for (const session of sessions) {
    const atMs = new Date(String(session.next_booking_at)).getTime();
    if (Number.isNaN(atMs)) continue;
    if (atMs >= startMs && atMs < endMs) {
      today.push(session);
    } else if (atMs < startMs) {
      history.push(session);
    }
  }

  return { today, history };
}
