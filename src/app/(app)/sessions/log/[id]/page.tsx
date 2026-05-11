import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { sessionDurationHours } from "@/lib/lesson";
import { formatSingaporeScheduleHeadingWithTimeRange } from "@/lib/singapore-date";
import { logBookedSession } from "../../actions";

export default async function LogBookedSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const lang = await getLang();
  const d = dict[lang];

  let session: any = null;
  const q1 = await supabase
    .from("sessions")
    .select(
      "id,next_booking_at,next_booking_duration_hours, venues(name,address), lesson_modes(code,label)",
    )
    .eq("id", id)
    .single();
  if (!q1.error) {
    session = q1.data;
  } else {
    const q2 = await supabase
      .from("sessions")
      .select("id,next_booking_at, venues(name,address), lesson_modes(code,label)")
      .eq("id", id)
      .single();
    session = q2.data;
  }

  if (!session) notFound();
  if (!session.next_booking_at) {
    // Already recorded or not a booking.
    notFound();
  }

  const { data: links } = await supabase
    .from("session_students")
    .select("student_id, students(id,name)")
    .eq("session_id", id);

  const students = (links ?? [])
    .map((r: any) => ({ id: r.students?.id as string | undefined, name: r.students?.name as string | undefined }))
    .filter((x) => x.id && x.name) as { id: string; name: string }[];

  async function action(formData: FormData) {
    "use server";
    return logBookedSession(id, formData);
  }

  const venue = session.venues as any;
  const mode = session.lesson_modes as any;
  const venueText = venue?.name ?? (lang === "zh" ? "（未填场地）" : "(No venue)");
  const durationHours = sessionDurationHours({
    duration_hours: session.next_booking_duration_hours,
    lesson_modes: mode,
  });
  const scheduleText = formatSingaporeScheduleHeadingWithTimeRange(
    String(session.next_booking_at),
    durationHours,
    lang,
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/sessions"
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          ← {d.nav_session_list}
        </Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
          {lang === "zh" ? "记录已约课程" : "Log booked class"}
        </h1>
        <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">{scheduleText}</div>
          <div className="mt-1 text-sm text-slate-700">{venueText}</div>
          {students.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {students.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800"
                >
                  {s.name}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-slate-600/90">
              {lang === "zh" ? "未关联学员。" : "No students linked."}
            </div>
          )}
        </div>
      </div>

      <form
        action={action}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "课程记录（这次 + 下次）" : "Class notes (this + next)"}
          </label>
          <textarea
            name="content"
            rows={7}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
            placeholder={lang === "zh" ? "这次：……\n下次：……" : "This: ...\nNext: ..."}
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 px-4 py-2 text-sm font-medium text-white shadow-md shadow-sky-900/15"
        >
          {lang === "zh" ? "保存本次记录" : "Save"}
        </button>
      </form>
    </div>
  );
}

