/** Default lesson length (hours) for all modes unless overridden per session. */
export const DEFAULT_LESSON_HOURS = 2;

export function sessionDurationHours(row: { duration_hours?: number | null } | null) {
  const h = row?.duration_hours;
  if (h == null || Number.isNaN(Number(h))) return DEFAULT_LESSON_HOURS;
  return Math.max(0, Number(h));
}
