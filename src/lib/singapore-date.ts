import { addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";

/** Calendar date YYYY-MM-DD in Asia/Singapore. */
export function singaporeTodayYmd(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

/** Calendar date + weekday in Asia/Singapore from ISO or YYYY-MM-DD. */
export function formatSingaporeDateHeading(value: string, lang: "zh" | "en"): string {
  const raw = value.trim();
  if (!raw) return "";
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00+08:00` : raw;
  return formatBookingScheduleHeading(iso, lang);
}

function formatSingaporeClockTime(date: Date, lang: "zh" | "en"): string {
  return date.toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-SG", {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Clock range in Asia/Singapore, e.g. 14:00–16:00. */
export function formatSingaporeTimeRange(
  startIso: string,
  durationHours: number,
  lang: "zh" | "en",
): string {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";
  const hours = Number.isFinite(durationHours) && durationHours > 0 ? durationHours : 2;
  const end = new Date(start.getTime() + hours * 3_600_000);
  return `${formatSingaporeClockTime(start, lang)}–${formatSingaporeClockTime(end, lang)}`;
}

/** Booking list heading: calendar date + weekday + clock range in Asia/Singapore. */
export function formatSingaporeScheduleHeadingWithTimeRange(
  startIso: string,
  durationHours: number,
  lang: "zh" | "en",
): string {
  const datePart = formatBookingScheduleHeading(startIso, lang);
  const timePart = formatSingaporeTimeRange(startIso, durationHours, lang);
  if (!datePart) return timePart;
  if (!timePart) return datePart;
  return `${datePart} · ${timePart}`;
}

/** Booking list heading: calendar date + weekday in Asia/Singapore. */
export function formatBookingScheduleHeading(iso: string, lang: "zh" | "en"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const ymd = d.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
  const weekday = d.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-SG", {
    timeZone: "Asia/Singapore",
    weekday: lang === "zh" ? "long" : "short",
  });
  if (lang === "zh") {
    const [y, m, day] = ymd.split("-");
    return `${y}年${Number(m)}月${Number(day)}日 · ${weekday}`;
  }
  return `${ymd} (${weekday})`;
}

/** UTC ISO bounds for the current Singapore calendar day: [start, end). */
export function singaporeTodayBoundsUtcIso(now = new Date()): { startIso: string; endIso: string } {
  const ymd = singaporeTodayYmd(now); // YYYY-MM-DD in Asia/Singapore
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  // Singapore is UTC+8, no DST. Singapore midnight == UTC previous day 16:00.
  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - 8 * 3600_000;
  const endUtcMs = startUtcMs + 24 * 3600_000;
  return { startIso: new Date(startUtcMs).toISOString(), endIso: new Date(endUtcMs).toISOString() };
}

/** UTC ISO bounds for a Singapore calendar day (YYYY-MM-DD): [start, end). */
export function singaporeDayBoundsUtcIso(ymd: string): { startIso: string; endIso: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return singaporeTodayBoundsUtcIso();
  const y = Number(m[1]);
  const mon = Number(m[2]);
  const d = Number(m[3]);
  const startUtcMs = Date.UTC(y, mon - 1, d, 0, 0, 0) - 8 * 3600_000;
  const endUtcMs = startUtcMs + 24 * 3600_000;
  return { startIso: new Date(startUtcMs).toISOString(), endIso: new Date(endUtcMs).toISOString() };
}

export function singaporeCurrentMonthRange(now = new Date()): {
  fromStr: string;
  toStr: string;
} {
  const today = singaporeTodayYmd(now);
  const fromStr = `${today.slice(0, 7)}-01`;
  const toStr = format(endOfMonth(parseISO(fromStr)), "yyyy-MM-dd");
  return { fromStr, toStr };
}

export type FinancePreset = "month" | "quarter" | "year" | "custom";

export function parseFinancePreset(s: string | undefined): FinancePreset {
  if (s === "quarter" || s === "year" || s === "custom") return s;
  return "month";
}

/** Range for finance stats (Singapore calendar). */
export function rangeForPreset(preset: FinancePreset, now = new Date()): {
  fromStr: string;
  toStr: string;
} {
  const today = singaporeTodayYmd(now);
  const y = Number(today.slice(0, 4));

  if (preset === "month") {
    return singaporeCurrentMonthRange(now);
  }
  if (preset === "quarter") {
    const d = parseISO(today);
    const start = startOfMonth(addMonths(d, -2));
    const end = endOfMonth(d);
    return { fromStr: format(start, "yyyy-MM-dd"), toStr: format(end, "yyyy-MM-dd") };
  }
  if (preset === "year") {
    return { fromStr: `${y}-01-01`, toStr: `${y}-12-31` };
  }
  return singaporeCurrentMonthRange(now);
}
