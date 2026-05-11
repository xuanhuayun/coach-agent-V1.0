import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { formatLessonModeRatio } from "@/lib/lesson-mode";
import { formatBookingScheduleHeading } from "@/lib/singapore-date";

type StudentRef = { id: string; name: string };

export function BookingSessionListItem({
  id,
  nextBookingAt,
  venueName,
  modeCode,
  students,
  remarks,
  lang,
}: {
  id: string;
  nextBookingAt: string;
  venueName: string | null | undefined;
  modeCode: string | null | undefined;
  students: StudentRef[];
  remarks: string | null | undefined;
  lang: Lang;
}) {
  const dateText = formatBookingScheduleHeading(nextBookingAt, lang);
  const venueText = venueName ?? (lang === "zh" ? "（未填场地）" : "(No venue)");
  const ratioText = formatLessonModeRatio(modeCode, lang);
  const who = students.filter((student) => student.id && student.name);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="text-sm font-semibold text-slate-900">{dateText}</div>
          <div className="text-sm text-slate-700">
            {venueText} · {ratioText}
          </div>
          {who.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {who.map((student) => (
                <Link
                  key={student.id}
                  href={`/students/${student.id}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100"
                >
                  {student.name}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600/90">
              {lang === "zh" ? "未关联学员。" : "No students linked."}
            </div>
          )}
          {remarks ? (
            <div className="text-sm text-slate-700">
              <span className="text-xs font-semibold text-slate-500">
                {lang === "zh" ? "备注" : "Notes"}：
              </span>{" "}
              {remarks}
            </div>
          ) : null}
        </div>
        <Link
          href={`/bookings/${id}`}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          aria-label={lang === "zh" ? "编辑" : "Edit"}
          title={lang === "zh" ? "编辑" : "Edit"}
        >
          ✎
        </Link>
      </div>
    </div>
  );
}
