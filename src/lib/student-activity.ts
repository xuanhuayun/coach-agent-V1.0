function ymdToUtcDayNumber(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const ms = Date.UTC(y, mo - 1, d);
  return Math.floor(ms / 86_400_000);
}

/** Singapore calendar "today" as YYYY-MM-DD should be passed in from callers. */
export function computeAttendanceFlags(
  lastPastSessionYmd: string | null,
  nextFutureSessionYmd: string | null,
  todayYmd: string,
): {
  daysSinceLast: number | null;
  daysUntilNext: number | null;
  past10: boolean;
  past20: boolean;
  future10: boolean;
  future20: boolean;
  isDormant: boolean;
} {
  const todayDay = ymdToUtcDayNumber(todayYmd);
  if (todayDay == null) {
    return {
      daysSinceLast: null,
      daysUntilNext: null,
      past10: false,
      past20: false,
      future10: false,
      future20: false,
      isDormant: true,
    };
  }

  const lastDay = lastPastSessionYmd ? ymdToUtcDayNumber(lastPastSessionYmd) : null;
  const nextDay = nextFutureSessionYmd ? ymdToUtcDayNumber(nextFutureSessionYmd) : null;

  const daysSinceLast = lastDay == null ? null : todayDay - lastDay;
  const daysUntilNext = nextDay == null ? null : nextDay - todayDay;

  return {
    daysSinceLast,
    daysUntilNext,
    past10: daysSinceLast != null ? daysSinceLast >= 0 && daysSinceLast <= 10 : false,
    past20: daysSinceLast != null ? daysSinceLast >= 0 && daysSinceLast <= 20 : false,
    future10: daysUntilNext != null ? daysUntilNext > 0 && daysUntilNext <= 10 : false,
    future20: daysUntilNext != null ? daysUntilNext > 0 && daysUntilNext <= 20 : false,
    isDormant: daysSinceLast == null ? true : daysSinceLast > 30,
  };
}
