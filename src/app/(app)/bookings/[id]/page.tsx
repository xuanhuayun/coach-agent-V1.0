import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/guards";
import { dict } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { sortLessonModes } from "@/lib/lesson-mode";
import { ensureLessonModes, listLessonModes } from "@/lib/lesson-modes-server";
import { deleteBooking, updateBooking } from "../actions";
import { EditBookingForm } from "./EditBookingForm";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = String(id ?? "").trim();
  if (!sessionId) notFound();

  const { supabase } = await requireUser();
  const lang = await getLang();
  const d = dict[lang];

  const [{ data: venues }, modesRaw, { data: students }] = await Promise.all([
    supabase.from("venues").select("id,name").order("created_at", { ascending: false }),
    listLessonModes(supabase),
    supabase.from("students").select("id,name").order("created_at", { ascending: false }),
  ]);
  const modes = sortLessonModes(modesRaw);

  const q = await supabase
    .from("sessions")
    .select("id,venue_id,lesson_mode_id,next_booking_at,next_booking_duration_hours,remarks")
    .eq("id", sessionId)
    .single();

  // Backward compatible: duration column might not exist.
  const session =
    !q.error && q.data
      ? q.data
      : (
          await supabase
            .from("sessions")
            .select("id,venue_id,lesson_mode_id,next_booking_at,remarks")
            .eq("id", sessionId)
            .single()
        ).data;

  if (!session) notFound();

  const { data: links } = await supabase
    .from("session_students")
    .select("student_id")
    .eq("session_id", sessionId);

  const initialStudentIds = (links ?? []).map((l: any) => String(l.student_id)).filter(Boolean);

  const initialNextBookingAt = String((session as any).next_booking_at ?? "").trim();
  const initialNextBookingDurationHours = Number((session as any).next_booking_duration_hours ?? 2) || 2;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/bookings" className="text-xs text-slate-500 hover:text-slate-800">
          ← {lang === "zh" ? `返回${d.nav_bookings}` : `Back to ${d.nav_bookings}`}
        </Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
          {lang === "zh" ? "约课详情" : "Booking detail"}
        </h1>
      </div>

      <EditBookingForm
        lang={lang}
        sessionId={sessionId}
        venues={(venues ?? []) as any}
        modes={(modes ?? []) as any}
        students={(students ?? []).map((s: any) => ({ id: s.id, name: s.name }))}
        initialVenueId={(session as any).venue_id ?? null}
        initialModeId={(session as any).lesson_mode_id ?? null}
        initialNextBookingAt={initialNextBookingAt}
        initialNextBookingDurationHours={initialNextBookingDurationHours}
        initialRemarks={(session as any).remarks ?? null}
        initialStudentIds={initialStudentIds}
        action={updateBooking}
        deleteAction={deleteBooking}
      />
    </div>
  );
}

