import { sortLessonModes } from "@/lib/lesson-mode";
import { ensureLessonModes, listLessonModes } from "@/lib/lesson-modes-server";
import { fetchRecentBookingStudents } from "@/lib/bookings-page-data";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { BookingPanel } from "./BookingPanel";
import { createBooking } from "./actions";

export async function BookingPanelSection() {
  const { supabase, user } = await requireUser();
  const lang = await getLang();
  await ensureLessonModes(supabase, user.id);

  const [{ data: venues }, modesRaw, { data: students }, recentStudents] = await Promise.all([
    supabase.from("venues").select("id,name").order("created_at", { ascending: false }),
    listLessonModes(supabase),
    supabase.from("students").select("id,name").order("created_at", { ascending: false }),
    fetchRecentBookingStudents(supabase),
  ]);
  const modes = sortLessonModes(modesRaw);

  return (
    <BookingPanel
      lang={lang}
      venues={venues ?? []}
      modes={modes ?? []}
      students={(students ?? []).map((student: { id: string; name: string }) => ({
        id: student.id,
        name: student.name,
      }))}
      recentStudents={recentStudents}
      action={createBooking}
    />
  );
}
