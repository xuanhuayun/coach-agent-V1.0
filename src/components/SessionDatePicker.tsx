"use client";

import { useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { singaporeTodayYmd } from "@/lib/singapore-date";

export function SessionDatePicker({
  lang,
  value: controlledValue,
  onValueChange,
}: {
  lang: Lang;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const todayYmd = useMemo(() => singaporeTodayYmd(), []);
  const [internalValue, setInternalValue] = useState<string>(todayYmd);
  const value = controlledValue ?? internalValue;
  const isToday = value === todayYmd;

  function setValue(next: string) {
    if (onValueChange) onValueChange(next);
    else setInternalValue(next);
  }

  return (
    <input
      type="date"
      name="sessionDate"
      value={value}
      max={todayYmd}
      onChange={(e) => setValue(e.target.value)}
      aria-label={lang === "zh" ? "上课日期" : "Session date"}
      className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/25 ${
        isToday
          ? "border-sky-500 bg-sky-50/70 font-medium text-sky-950 focus:border-sky-600"
          : "border-slate-300 bg-white text-slate-900 focus:border-sky-600"
      }`}
    />
  );
}
