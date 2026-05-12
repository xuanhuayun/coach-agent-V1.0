import {
  BOOKING_REPEAT_DEFAULT_COUNT,
  BOOKING_REPEAT_MAX_COUNT,
  type BookingRepeatType,
} from "@/lib/booking-recurrence";

export const BOOKING_DRAFT_KEY = "coach_agent_booking_draft";

export type BookingDraft = {
  modeId: string;
  venueId: string;
  remarks: string;
  query: string;
  studentIds: string[];
  repeatType: BookingRepeatType;
  repeatCount: number;
  pickerOpen: boolean;
  pickerChosen: boolean;
  pickerDate: string;
  pickerHour: string;
  pickerMinute: "00" | "30";
  pickerDuration: "1" | "2";
};

export function createEmptyBookingDraft(): BookingDraft {
  return {
    modeId: "",
    venueId: "",
    remarks: "",
    query: "",
    studentIds: [],
    repeatType: "none",
    repeatCount: BOOKING_REPEAT_DEFAULT_COUNT,
    pickerOpen: false,
    pickerChosen: false,
    pickerDate: "",
    pickerHour: "12",
    pickerMinute: "00",
    pickerDuration: "2",
  };
}

function isMinute(v: unknown): v is BookingDraft["pickerMinute"] {
  return v === "00" || v === "30";
}

function isDuration(v: unknown): v is BookingDraft["pickerDuration"] {
  return v === "1" || v === "2";
}

function isRepeatType(v: unknown): v is BookingRepeatType {
  return v === "none" || v === "weekly" || v === "biweekly" || v === "monthly";
}

export function readBookingDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BOOKING_DRAFT_KEY);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as Partial<BookingDraft>;
    const empty = createEmptyBookingDraft();
    const studentIds = Array.isArray(parsed.studentIds)
      ? parsed.studentIds.filter((id): id is string => typeof id === "string")
      : empty.studentIds;
    return {
      modeId: typeof parsed.modeId === "string" ? parsed.modeId : empty.modeId,
      venueId: typeof parsed.venueId === "string" ? parsed.venueId : empty.venueId,
      remarks: typeof parsed.remarks === "string" ? parsed.remarks : empty.remarks,
      query: typeof parsed.query === "string" ? parsed.query : empty.query,
      studentIds,
      repeatType: isRepeatType(parsed.repeatType) ? parsed.repeatType : empty.repeatType,
      repeatCount:
        typeof parsed.repeatCount === "number" && Number.isFinite(parsed.repeatCount)
          ? Math.min(BOOKING_REPEAT_MAX_COUNT, Math.max(1, Math.trunc(parsed.repeatCount)))
          : empty.repeatCount,
      pickerOpen: Boolean(parsed.pickerOpen),
      pickerChosen: Boolean(parsed.pickerChosen),
      pickerDate: typeof parsed.pickerDate === "string" ? parsed.pickerDate : empty.pickerDate,
      pickerHour: typeof parsed.pickerHour === "string" ? parsed.pickerHour : empty.pickerHour,
      pickerMinute: isMinute(parsed.pickerMinute) ? parsed.pickerMinute : empty.pickerMinute,
      pickerDuration: isDuration(parsed.pickerDuration) ? parsed.pickerDuration : empty.pickerDuration,
    };
  } catch {
    return null;
  }
}

export function writeBookingDraft(draft: BookingDraft) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
}

export function clearBookingDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BOOKING_DRAFT_KEY);
}
