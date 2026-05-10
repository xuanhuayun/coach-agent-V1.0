"use client";

import { useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n";

export function SessionDatePicker({ lang }: { lang: Lang }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [value, setValue] = useState<string>(today);

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="date"
        name="sessionDate"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
      />
      <button
        type="button"
        onClick={() => setValue(today)}
        className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {lang === "zh" ? "恢复今天" : "Today"}
      </button>
    </div>
  );
}

