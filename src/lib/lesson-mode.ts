import type { Lang } from "@/lib/i18n";
import { formatSgdFromCents } from "@/lib/money";

export type LessonModeLike = {
  code: string;
  label: string;
  default_price_cents: number;
  default_duration_hours?: number | null;
};

export const LESSON_MODE_DEFINITIONS = [
  {
    code: "1:1-1h",
    labelZh: "1：1，1小时，人均",
    labelEn: "1:1, 1 hour",
    durationHours: 1,
    defaultPriceCents: 12000,
  },
  {
    code: "1:1-2h",
    labelZh: "1：1，2小时，人均",
    labelEn: "1:1, 2 hours",
    durationHours: 2,
    defaultPriceCents: 24000,
  },
  {
    code: "1:2-2h",
    labelZh: "1：2，2小时，人均",
    labelEn: "1:2, 2 hours",
    durationHours: 2,
    defaultPriceCents: 13000,
  },
  {
    code: "1:3-2h",
    labelZh: "1：3，2小时，人均",
    labelEn: "1:3, 2 hours",
    durationHours: 2,
    defaultPriceCents: 9500,
  },
  {
    code: "1:4-2h",
    labelZh: "1：4，2小时，人均",
    labelEn: "1:4, 2 hours",
    durationHours: 2,
    defaultPriceCents: 8000,
  },
] as const;

export const LESSON_MODE_CODES = LESSON_MODE_DEFINITIONS.map((d) => d.code);

export function lessonModeDefinitionByCode(code: string) {
  return LESSON_MODE_DEFINITIONS.find((d) => d.code === code) ?? null;
}

export function normalizeLessonModeCode(code: string | null | undefined): string {
  return String(code ?? "").trim().replace(/：/g, ":");
}

export function formatLessonModeRatio(code: string | null | undefined, lang: Lang): string {
  if (!code) return lang === "zh" ? "（未填模式）" : "(No mode)";
  const normalized = normalizeLessonModeCode(code);
  const ratio = /^1:\d/.exec(normalized)?.[0];
  return ratio ?? normalized;
}

export function requiredCountFromModeCode(code: string | null | undefined): number | null {
  const normalized = normalizeLessonModeCode(code);
  if (!normalized) return null;
  const m = /^1:(\d)/.exec(normalized);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 4 ? n : null;
}

export function durationHoursFromModeCode(code: string | null | undefined): number | null {
  const normalized = normalizeLessonModeCode(code);
  if (!normalized) return null;
  const m = /-(\d)h$/i.exec(normalized);
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 ? n : null;
}

export function resolveModeDurationHours(mode: LessonModeLike): number {
  if (typeof mode.default_duration_hours === "number" && mode.default_duration_hours > 0) {
    return mode.default_duration_hours;
  }
  return durationHoursFromModeCode(mode.code) ?? 2;
}

export function sessionRevenueCents(perPersonCents: number, headcount: number): number {
  return perPersonCents * headcount;
}

export function formatLessonModeOption(mode: LessonModeLike, lang: Lang): string {
  const price = formatSgdFromCents(mode.default_price_cents);
  const students = requiredCountFromModeCode(mode.code);
  if (lang === "zh") {
    return `${mode.label}，${price}`;
  }
  const priceText = students != null && students > 1 ? `${price} / person` : price;
  return `${mode.label}, ${priceText}`;
}

export function sortLessonModes<T extends { code: string }>(modes: T[]): T[] {
  const wanted = new Set<string>(LESSON_MODE_CODES);
  const order = new Map<string, number>(LESSON_MODE_CODES.map((code, index) => [code, index]));
  return [...modes].filter((m) => wanted.has(m.code)).sort((a, b) => {
    const ai = order.get(a.code);
    const bi = order.get(b.code);
    if (ai == null && bi == null) return a.code.localeCompare(b.code);
    if (ai == null) return 1;
    if (bi == null) return -1;
    return ai - bi;
  });
}
