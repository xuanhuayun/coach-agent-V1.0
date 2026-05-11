"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { singaporeTodayYmd } from "@/lib/singapore-date";

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
  open: controlledOpen,
  onOpenChange,
  date: controlledDate,
  onDateChange,
  hour: controlledHour,
  onHourChange,
  minute: controlledMinute,
  onMinuteChange,
  duration: controlledDuration,
  onDurationChange,
  durationEditable = true,
  chosen: controlledChosen,
  onChosenChange,
}: {
  lang: Lang;
  initialNextBookingAt?: string;
  initialNextBookingDurationHours?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  date?: string;
  onDateChange?: (date: string) => void;
  hour?: string;
  onHourChange?: (hour: string) => void;
  minute?: "00" | "30";
  onMinuteChange?: (minute: "00" | "30") => void;
  duration?: "1" | "2";
  onDurationChange?: (duration: "1" | "2") => void;
  durationEditable?: boolean;
  chosen?: boolean;
  onChosenChange?: (chosen: boolean) => void;
}) {
  const isControlled = onOpenChange != null;
  const [internalOpen, setInternalOpen] = useState(Boolean(defaultOpen));
  const [internalDate, setInternalDate] = useState<string>("");
  const [internalHour, setInternalHour] = useState<string>("12");
  const [internalMinute, setInternalMinute] = useState<"00" | "30">("00");
  const [internalDuration, setInternalDuration] = useState<"1" | "2">("2");

  const open = isControlled ? Boolean(controlledOpen) : internalOpen;
  const date = isControlled ? (controlledDate ?? "") : internalDate;
  const hour = isControlled ? (controlledHour ?? "12") : internalHour;
  const minute = isControlled ? (controlledMinute ?? "00") : internalMinute;
  const duration = isControlled ? (controlledDuration ?? "2") : internalDuration;
  const chosen = isControlled ? Boolean(controlledChosen) : internalDate.length > 0;

  const t = useMemo(() => {
    return lang === "zh"
      ? { btn: "设置时间段", start: "开始", dur: "时长", clear: "清空" }
      : { btn: "Set time", start: "Start", dur: "Duration" };
  }, [lang]);

  function setOpen(next: boolean) {
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }

  function markChosen() {
    if (isControlled) onChosenChange?.(true);
  }

  function setDate(next: string) {
    if (next) markChosen();
    if (isControlled) onDateChange?.(next);
    else setInternalDate(next);
  }

  function setHour(next: string) {
    markChosen();
    if (isControlled) onHourChange?.(next);
    else setInternalHour(next);
  }

  function setMinute(next: "00" | "30") {
    markChosen();
    if (isControlled) onMinuteChange?.(next);
    else setInternalMinute(next);
  }

  function setDuration(next: "1" | "2") {
    markChosen();
    if (isControlled) onDurationChange?.(next);
    else setInternalDuration(next);
  }

  useEffect(() => {
    if (isControlled) return;
    if (!open) return;
    if (date) return;

    if (initialNextBookingAt) {
      const d = new Date(initialNextBookingAt);
      if (!Number.isNaN(d.getTime())) {
        const v = toLocalDatetimeValue(d);
        setInternalDate(v.slice(0, 10));
        setInternalHour(v.slice(11, 13));
        setInternalMinute(v.slice(14, 16) === "30" ? "30" : "00");
        const h = Number(initialNextBookingDurationHours ?? 2);
        setInternalDuration(h === 1 ? "1" : "2");
        return;
      }
    }

    const now = new Date();
    const rounded = roundToHalfHour(now);
    const v = toLocalDatetimeValue(rounded);
    setInternalDate(v.slice(0, 10));
    setInternalHour(v.slice(11, 13));
    setInternalMinute(v.slice(14, 16) === "30" ? "30" : "00");
  }, [open, date, initialNextBookingAt, initialNextBookingDurationHours, isControlled]);

  const value = useMemo(() => {
    if (!chosen || !date) return "";
    return `${date}T${hour}:${minute}`;
  }, [chosen, date, hour, minute]);

  function clear() {
    setOpen(false);
    if (isControlled) onChosenChange?.(false);
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
      <input type="hidden" name="nextBookingAt" value={value} />
      {value ? (
        <input type="hidden" name="nextBookingDurationHours" value={duration} />
      ) : null}
      <input
        type="date"
        value={date}
        min={singaporeTodayYmd()}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
        aria-label={t.start}
      />
      <select
        value={hour}
        onChange={(e) => setHour(e.target.value)}
        className="w-20 rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
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
        className="w-20 rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
        aria-label={lang === "zh" ? "分钟" : "Minute"}
      >
        <option value="00">00</option>
        <option value="30">30</option>
      </select>
      {durationEditable ? (
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value === "1" ? "1" : "2")}
          className="w-24 rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
          aria-label={t.dur}
        >
          <option value="1">{lang === "zh" ? "1小时" : "1h"}</option>
          <option value="2">{lang === "zh" ? "2小时" : "2h"}</option>
        </select>
      ) : null}
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
