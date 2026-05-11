import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { formatHours } from "@/lib/lesson";
import { formatLessonModeRatio } from "@/lib/lesson-mode";
import { formatSgdFromCents } from "@/lib/money";
import {
  formatSingaporeDateHeading,
  formatSingaporeScheduleHeadingWithTimeRange,
} from "@/lib/singapore-date";

export function SessionHistoryListRow({
  lang,
  href,
  sessionDate,
  modeCode,
  durationHours,
  studentNames,
  detailLabel,
  classRevenueCents,
  rowVariant = "logged",
}: {
  lang: Lang;
  href: string;
  sessionDate: string;
  modeCode: string;
  durationHours: number;
  studentNames: string[];
  detailLabel: string;
  classRevenueCents?: number | null;
  rowVariant?: "logged" | "booking";
}) {
  const headingText =
    rowVariant === "booking"
      ? formatSingaporeScheduleHeadingWithTimeRange(sessionDate, durationHours, lang)
      : `${formatSingaporeDateHeading(sessionDate, lang)} · ${formatLessonModeRatio(modeCode, lang)} · ${formatHours(durationHours, lang)}`;

  return (
    <Link href={href} className="block p-4 transition-colors hover:bg-slate-50">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{headingText}</div>
          {studentNames.length > 0 ? (
            <div className="mt-1 text-xs text-slate-700">
              {lang === "zh" ? "学员" : "Students"}：
              {studentNames.join(lang === "zh" ? "、" : ", ")}
            </div>
          ) : null}
          {classRevenueCents != null && classRevenueCents > 0 ? (
            <div className="mt-1 text-xs text-slate-700">
              {lang === "zh" ? "本节课收入" : "Class revenue"}：
              {formatSgdFromCents(classRevenueCents)}
            </div>
          ) : null}
        </div>
        <span className="shrink-0 text-xs font-medium text-sky-700">{detailLabel}</span>
      </div>
    </Link>
  );
}
