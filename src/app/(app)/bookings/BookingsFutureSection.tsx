import { addDays, format, parseISO } from "date-fns";
import { BookingSessionListItem } from "@/components/BookingSessionListItem";
import { fetchFutureBookings } from "@/lib/bookings-page-data";
import { getLang } from "@/lib/i18n-server";
import { sessionDurationHours } from "@/lib/lesson";
import { singaporeDayBoundsUtcIso, singaporeTodayYmd } from "@/lib/singapore-date";
import { requireUser } from "@/lib/supabase/guards";

export async function BookingsFutureSection() {
  const { supabase } = await requireUser();
  const lang = await getLang();
  const todayYmd = singaporeTodayYmd();
  const tomorrowYmd = format(addDays(parseISO(todayYmd), 1), "yyyy-MM-dd");
  const tomorrowStartIso = singaporeDayBoundsUtcIso(tomorrowYmd).startIso;
  const { sessions, bySession } = await fetchFutureBookings(supabase, tomorrowStartIso);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">
        {lang === "zh" ? "未来已约课程" : "Future bookings"}
      </h2>
      {sessions.length === 0 ? (
        <div className="text-sm text-slate-600/90">
          {lang === "zh" ? "未来还没有约课。" : "No future bookings."}
        
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
