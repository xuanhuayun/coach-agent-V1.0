import { BookingSessionListItem } from "@/components/BookingSessionListItem";
import { fetchDayBookings } from "@/lib/bookings-page-data";
import { dict } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { sessionDurationHours } from "@/lib/lesson";
import { singaporeDayBoundsUtcIso } from "@/lib/singapore-date";
import { requireUser } from "@/lib/supabase/guards";

export async function BookingsTodaySection({
  selectedYmd,
  todayYmd,
}: {
  selectedYmd: string;
  todayYmd: string;
}) {
  const { supabase } = await requireUser();
  const lang = await getLang();
  const d = dict[lang] as Record<string, string>;
  const { startIso, endIso } = singaporeDayBoundsUtcIso(selectedYmd);
  const { sessions, bySession } = await fetchDayBookings(supabase, startIso, endIso);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">{d.bookings_today}</h2>
      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600/90">
          {selectedYmd === todayYmd
            ? d.bookings_empty
            : lang === "zh"
              ? "这一天没有约课。"
              : "No bookings that day."}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <BookingSessionListItem
              key={session.id}
              id={session.id}
              nextBookingAt={session.next_booking_at}
              durationHours={sessionDurationHours({
                duration_hours: session.next_booking_duration_hours,
                lesson_modes: session.lesson_modes,
              })}
              venueName={session.venues?.name}
              students={bySession.get(session.id) ?? []}
              remarks={session.remarks ?? null}
              lang={lang}
            />
          ))}
        </div>
      )}
    </section>
  );
}
