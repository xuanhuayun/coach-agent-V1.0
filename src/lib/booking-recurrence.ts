import { addMonths } from "date-fns";

export const BOOKING_REPEAT_DEFAULT_COUNT = 5;
export const BOOKING_REPEAT_MAX_COUNT = 20;

export type BookingRepeatType = "none" | "weekly" | "biweekly" | "monthly";

export function parseBookingRepeatType(raw: string): BookingRepeatType {
  if (raw === "weekly" || raw === "biweekly" || raw === "monthly") return raw;
  return "none";
}

export function parseBookingRepeatCount(raw: string, repeatType: BookingRepeatType): number {
  if (repeatType === "none") return 1;
  const parsed = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) return BOOKING_REPEAT_DEFAULT_COUNT;
  return Math.min(BOOKING_REPEAT_MAX_COUNT, Math.max(1, parsed));
}

export function buildRecurringBookingStarts(
  startIso: string,
  repeatType: BookingRepeatType,
  count: number,
): string[] {
  const first = new Date(startIso);
  if (Number.isNaN(first.getTime())) return [];
  const total = repeatType === "none" ? 1 : Math.min(BOOKING_REPEAT_MAX_COUNT, Math.max(1, count));
  const starts: Date[] = [first];

  for (let index = 1; index < total; index += 1) {
    const previous = starts[index - 1];
    const next =
      repeatType === "weekly"
        ? new Date(previous.getTime() + 7 * 24 * 3600_000)
        : repeatType === "biweekly"
          ? new Date(previous.getTime() + 14 * 24 * 3600_000)
          : repeatType === "monthly"
            ? addMonths(previous, 1)
            : previous;
    starts.push(next);
  }

  return starts.map((date) => date.toISOString());
}
