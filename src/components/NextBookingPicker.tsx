"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalDatetimeValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours(),
  )}:${pad2(d.getMinutes())}`;
}

function roundToHalfHour(d: Date) {
  const x = new Date(d);
  const m = x.getMinutes();
  const rounded = m <= 15 ? 0 : m <= 45 ? 30 : 0;
  if (m > 45) x.setHours(x.getHours() + 1);
  x.setMinutes(rounded, 0, 0);
  return x;
}

export function NextBookingPicker({
  lang,
  initialNextBookingAt,
  initialNextBookingDurationHours,
  defaultOpen,
}: {
  lang: Lang;
  initialNextBookingAt?: string;
  initialNextBookingDurationHours?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const [date, setDate] = useState<string>("");
  const [hour, setHour] = useState<string>("12");
  const [minute, setMinute] = useState<"00" | "30">("00");
  const [duration, setDuration] = useState<"1" | "2">("2");

  const t = useMemo(() => {
    return lang === "zh"
      ? { btn: "设置时间段", start: "开始", dur: "时长", clear: "清空" }
      : { btn: "Set time", start: "Start", dur: "Duration" };
  }, [lang]);

  useEffect(() => {
    if (!open) return;
    if (date) return;

    // If editing, prefer the initial values.
    if (initialNextBookingAt) {
      const d = new Date(initialNextBookingAt);
      if (!Number.isNaN(d.getTime())) {
        const v = toLocalDatetimeValue(d); // YYYY-MM-DDTHH:MM
        setDate(v.slice(0, 10));
        setHour(v.slice(11, 13));
        setMinute(v.slice(14, 16) === "30" ? "30" : "00");
        const h = Number(initialNextBookingDurationHours ?? 2);
        setDuration(h === 1 ? "1" : "2");
        return;
      }
    }

    // Default: now (rounded to :00/:30).
    const now = new Date();
    const rounded = roundToHalfHour(now);
    const v = toLocalDatetimeValue(rounded); // YYYY-MM-DDTHH:MM
    setDate(v.slice(0, 10));
    setHour(v.slice(11, 13));
    setMinute(v.slice(14, 16) === "30" ? "30" : "00");
  }, [open, date, initialNextBookingAt, initialNextBookingDurationHours]);

  const value = useMemo(() => {
    if (!date) return "";
    return `${date}T${hour}:${minute}`;
  }, [date, hour, minute]);

  function clear() {
    setOpen(false);
    setDate("");
    setHour("12");
    setMinute("00");
    setDuration("2");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {t.btn}
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {/* hidden combined value for server action */}
      <input type="hidden" name="nextBookingAt" value={value} />
      <input type="hidden" name="nextBookingDurationHours" value={duration} />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
        aria-label={t.start}
      />
      <select
        value={hour}
        onChange={(e) => setHour(e.target.value)}
        className="w-20 rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
        aria-label={lang === "zh" ? "小时" : "Hour"}
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <option key={i} value={pad2(i)}>
            {pad2(i)}
          </option>
        ))}
      </select>
      <select
        value={minute}
        onChange={(e) => setMinute(e.target.value === "30" ? "30" : "00")}
        className="w-20 rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
        aria-label={lang === "zh" ? "分钟" : "Minute"}
      >
        <option value="00">00</option>
        <option value="30">30</option>
      </select>
      <select
        value={duration}
        onChange={(e) => setDuration(e.target.value === "1" ? "1" : "2")}
        className="w-24 rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
        aria-label={t.dur}
      >
        <option value="1">1h</option>
        <option value="2">2h</option>
      </select>
      <button
        type="button"
        onClick={clear}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {lang === "zh" ? "清空" : "Clear"}
      </button>
    </div>
  );
}

