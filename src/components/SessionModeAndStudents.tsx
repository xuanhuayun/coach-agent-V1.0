"use client";

import { useMemo } from "react";
import type { Lang } from "@/lib/i18n";
import { formatLessonModeOption, requiredCountFromModeCode } from "@/lib/lesson-mode";
import { SessionStudentsAndImprovements } from "@/components/SessionStudentsAndImprovements";

type Mode = {
  id: string;
  code: string;
  label: string;
  default_price_cents: number;
  default_duration_hours?: number | null;
};
type Student = { id: string; name: string };

export function SessionModeAndStudents({
  lang,
  modes,
  students,
  children,
  showStudentNotes = true,
  lessonModeId,
  onLessonModeIdChange,
  selectedStudentIds,
  onSelectedStudentIdsChange,
  returnTo = "/sessions",
}: {
  lang: Lang;
  modes: Mode[];
  students: Student[];
  children: React.ReactNode;
  showStudentNotes?: boolean;
  lessonModeId: string;
  onLessonModeIdChange: (id: string) => void;
  selectedStudentIds: string[];
  onSelectedStudentIdsChange: (ids: string[]) => void;
  returnTo?: string;
}) {
  const mode = useMemo(() => modes.find((m) => m.id === lessonModeId) ?? null, [modes, lessonModeId]);
  const requiredCount = requiredCountFromModeCode(mode?.code);
  const mismatch = requiredCount != null && selectedStudentIds.length !== requiredCount;

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-slate-900">
          {lang === "zh" ? "上课模式（必选）" : "Mode (required)"}
        </label>
        <select
          name="lessonModeId"
          value={lessonModeId}
          onChange={(e) => onLessonModeIdChange(e.target.value)}
          className={`mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25 ${
            !lessonModeId ? "border-red-300" : "border-slate-300"
          }`}
        >
          <option value="">{lang === "zh" ? "请选择" : "Select"}</option>
          {modes.map((m) => (
            <option key={m.id} value={m.id}>
              {formatLessonModeOption(m, lang)}
            </option>
          ))}
        </select>
        {!lessonModeId ? (
          <div className="mt-1 select-text text-sm text-red-700">
            {lang === "zh" ? "上课模式必选，不然无法计算金额。" : "Mode is required."}
          </div>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900">
          {lang === "zh" ? "上课学员" : "Students"}
        </label>
        <SessionStudentsAndImprovements
          students={students}
          lang={lang}
          requiredCount={requiredCount ?? undefined}
          betweenSelectedAndImprovements={children}
          showImprovements={showStudentNotes}
          returnTo={returnTo}
          selectedIds={selectedStudentIds}
          onSelectedIdsChange={onSelectedStudentIdsChange}
        />
        {lessonModeId && requiredCount != null && mismatch ? (
          <div className="mt-1 select-text text-sm text-red-700">
            {lang === "zh"
              ? `该模式必须选择 ${requiredCount} 个学员。`
              : `This mode requires exactly ${requiredCount} students.`}
          </div>
        ) : null}
      </div>
    </div>
  );
}
