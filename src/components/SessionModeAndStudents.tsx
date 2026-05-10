"use client";

import { useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { SessionStudentsAndImprovements } from "@/components/SessionStudentsAndImprovements";

type Mode = { id: string; code: string; label: string; default_price_cents: number };
type Student = { id: string; name: string };

function requiredCountFromCode(code: string | null | undefined): number | null {
  if (!code) return null;
  const m = /^1:(\d)$/.exec(code.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 4 ? n : null;
}

export function SessionModeAndStudents({
  lang,
  modes,
  students,
  children,
  showStudentNotes = true,
}: {
  lang: Lang;
  modes: Mode[];
  students: Student[];
  children: React.ReactNode;
  showStudentNotes?: boolean;
}) {
  const [modeId, setModeId] = useState<string>("");
  const [selectedCount, setSelectedCount] = useState(0);

  const mode = useMemo(() => modes.find((m) => m.id === modeId) ?? null, [modes, modeId]);
  const requiredCount = requiredCountFromCode(mode?.code);

  const mismatch = requiredCount != null && selectedCount !== requiredCount;

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-slate-900">
          {lang === "zh" ? "上课模式（必选）" : "Mode (required)"}
        </label>
        <select
          name="lessonModeId"
          required
          value={modeId}
          onChange={(e) => setModeId(e.target.value)}
          className={`mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25 ${
            !modeId ? "border-red-300" : "border-slate-300"
          }`}
        >
          <option value="">{lang === "zh" ? "请选择" : "Select"}</option>
          {modes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code}（S${Math.round(m.default_price_cents / 100)}/{lang === "zh" ? "人" : "ea"}）
            </option>
          ))}
        </select>
        {!modeId ? (
          <div className="mt-1 text-sm text-red-600">
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
          onSelectedCountChange={setSelectedCount}
          betweenSelectedAndImprovements={children}
          showImprovements={showStudentNotes}
        />
        {modeId && requiredCount != null && mismatch ? (
          <div className="mt-1 text-sm text-red-600">
            {lang === "zh"
              ? `该模式必须选择 ${requiredCount} 个学员。`
              : `This mode requires exactly ${requiredCount} students.`}
          </div>
        ) : null}
      </div>
    </div>
  );
}

