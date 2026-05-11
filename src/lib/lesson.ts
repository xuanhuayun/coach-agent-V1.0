import { resolveModeDurationHours } from "@/lib/lesson-mode";

/** Default lesson length (hours) for all modes unless overridden per session. */
export const DEFAULT_LESSON_HOURS = 2;

type SessionDurationSource = {
  duration_hours?: number | null;
  lesson_modes?: {
    code?: string | null;
    label?: string | null;
    default_duration_hours?: number | null;
  } | null;
};

export function sessionDurationHours(row: SessionDurationSource | null) {
  const mode = row?.lesson_modes;
  if (mode?.code) {
    return resolveModeDurationHours({
      code: mode.code,
      label: mode.label ?? "",
      default_price_cents: 0,
      default_duration_hours: mode.default_duration_hours,
    });
  }

  const h = row?.duration_hours;
  if (h == null || Number.isNaN(Number(h))) return DEFAULT_LESSON_HOURS;
  return Math.max(0, Number(h));
}

export function formatHours(h: number, lang: "zh" | "en") {
  return lang === "zh" ? `${h}小时` : `${h}h`;
}
