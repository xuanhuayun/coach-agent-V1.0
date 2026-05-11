"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { formatHours } from "@/lib/lesson";
import { formatLessonModeRatio } from "@/lib/lesson-mode";
import { formatSgdFromCents } from "@/lib/money";

export type SessionHistoryListItem = {
  id: string;
  sessionDate: string;
  modeCode: string;
  durationHours: number;
  studentNames: string[];
  classRevenueCents: number;
};

export type SessionHistoryMonth = {
  key: string;
  label: string;
  sessions: SessionHistoryListItem[];
};

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

export function SessionHistoryByMonth({
  lang,
  months,
  initialMonthKey,
  rangeLabel,
  emptyMonthText,
  emptyAllText,
  detailLabel,
}: {
  lang: Lang;
  months: SessionHistoryMonth[];
  initialMonthKey: string;
  rangeLabel: string;
  emptyMonthText: string;
  emptyAllText: string;
  detailLabel: string;
}) {
  const initialIndex = useMemo(() => {
    const found = months.findIndex((m) => m.key === initialMonthKey);
    return found >= 0 ? found : Math.max(0, months.length - 1);
  }, [months, initialMonthKey]);

  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setIndex(clampIndex(initialIndex, months.length));
  }, [initialIndex, months.length]);

  const active = months[index];
  const canPrev = index > 0;
  const canNext = index < months.length - 1;

  const goPrev = useCallback(() => {
    setIndex((current) => clampIndex(current - 1, months.length));
  }, [months.length]);

  const goNext = useCallback(() => {
    setIndex((current) => clampIndex(current + 1, months.length));
  }, [months.length]);

  if (months.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600/90">
        {emptyAllText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {rangeLabel}:{" "}
          <span className="font-medium text-slate-800">{active?.label ?? "—"}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={lang === "zh" ? "上一月" : "Previous month"}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={lang === "zh" ? "下一月" : "Next month"}
          >
            ›
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null) return;
          const end = e.changedTouches[0]?.clientX ?? start;
          const delta = end - start;
          if (Math.abs(delta) < 48) return;
          if (delta < 0) goNext();
          else goPrev();
        }}
      >
        {(active?.sessions.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600/90">{emptyMonthText}</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {active.sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="block p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {s.sessionDate} · {formatLessonModeRatio(s.modeCode, lang)} ·{" "}
                        {formatHours(s.durationHours, lang)}
                      </div>
                      {s.studentNames.length > 0 ? (
                        <div className="mt-1 text-xs text-slate-700">
                          {lang === "zh" ? "学员" : "Students"}：
                          {s.studentNames.join(lang === "zh" ? "、" : ", ")}
                        </div>
                      ) : null}
                      {s.classRevenueCents > 0 ? (
                        <div className="mt-1 text-xs text-slate-700">
                          {lang === "zh" ? "本节课收入" : "Class revenue"}：
                          {formatSgdFromCents(s.classRevenueCents)}
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs font-medium text-sky-700">{detailLabel}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
