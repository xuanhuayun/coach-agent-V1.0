"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { SessionHistoryByMonth } from "./SessionHistoryByMonth";

export function SessionHistoryPanel({
  lang,
  title,
  hint,
  startMonthKey,
  currentMonthKey,
  rangeLabel,
  emptyMonthText,
  detailLabel,
}: {
  lang: Lang;
  title: string;
  hint: string;
  startMonthKey: string;
  currentMonthKey: string;
  rangeLabel: string;
  emptyMonthText: string;
  detailLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="text-left text-xs font-medium text-sky-700 hover:text-sky-800"
      >
        {open ? (lang === "zh" ? "收起历史记录" : "Hide history") : title}
      </button>

      {open ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{hint}</p>
          <SessionHistoryByMonth
            lang={lang}
            initialMonthKey={startMonthKey}
            currentMonthKey={currentMonthKey}
            rangeLabel={rangeLabel}
            emptyMonthText={emptyMonthText}
            detailLabel={detailLabel}
          />
        </div>
      ) : null}
    </section>
  );
}
