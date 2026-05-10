import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/guards";

type Body = { nextBookingAtIso?: string; nextBookingDurationHours?: number; excludeSessionId?: string };

export async function POST(req: Request) {
  const { supabase, user } = await requireUser();

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const nextBookingAtIso = String(body.nextBookingAtIso ?? "").trim();
  const dur = Number(body.nextBookingDurationHours ?? 2);
  const excludeSessionId = String(body.excludeSessionId ?? "").trim();
  if (!nextBookingAtIso || !Number.isFinite(dur) || dur <= 0) {
    return NextResponse.json({ conflicts: [] });
  }

  const start = new Date(nextBookingAtIso);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ conflicts: [] });
  }
  const end = new Date(start.getTime() + dur * 3600_000);

  // Query a small window then compute overlap in JS (no booking_end_at column).
  // Use a wide buffer to avoid missing overlaps from earlier/later starts.
  const windowStartIso = new Date(start.getTime() - 24 * 3600_000).toISOString();
  const windowEndIso = new Date(end.getTime() + 24 * 3600_000).toISOString();

  let candidates: any[] = [];
  const q1 = await supabase
    .from("sessions")
    .select("id,next_booking_at,next_booking_duration_hours")
    .eq("user_id", user.id)
    .not("next_booking_at", "is", null)
    .gte("next_booking_at", windowStartIso)
    .lt("next_booking_at", windowEndIso);
  if (!q1.error) {
    candidates = q1.data ?? [];
  } else {
    const q2 = await supabase
      .from("sessions")
      .select("id,next_booking_at")
      .eq("user_id", user.id)
      .not("next_booking_at", "is", null)
      .gte("next_booking_at", windowStartIso)
      .lt("next_booking_at", windowEndIso);
    candidates = q2.data ?? [];
  }

  const conflicts = (candidates ?? [])
    .filter((r: any) => !excludeSessionId || String(r.id) !== excludeSessionId)
    .map((r: any) => {
      const s = new Date(String(r.next_booking_at));
      const h = Number(r.next_booking_duration_hours ?? 2) || 2;
      const e = new Date(s.getTime() + h * 3600_000);
      const overlap = s < end && start < e;
      return overlap
        ? {
            id: String(r.id),
            startIso: s.toISOString(),
            endIso: e.toISOString(),
          }
        : null;
    })
    .filter(Boolean);

  return NextResponse.json({ conflicts });
}

