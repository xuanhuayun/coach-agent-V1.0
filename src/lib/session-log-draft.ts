import { LAST_SESSION_STUDENT_IDS_KEY } from "@/lib/session-student-prefs";
import { singaporeTodayYmd } from "@/lib/singapore-date";

export const SESSION_LOG_DRAFT_KEY = "coach_agent_session_log_draft";

export type SessionLogDraft = {
  sessionDate: string;
  venueId: string;
  lessonModeId: string;
  content: string;
  studentIds: string[];
  nextBookingOpen: boolean;
  nextBookingChosen: boolean;
  nextBookingDate: string;
  nextBookingHour: string;
  nextBookingMinute: "00" | "30";
  nextBookingDuration: "1" | "2";
};

export function createEmptySessionLogDraft(now = new Date()): SessionLogDraft {
  return {
    sessionDate: singaporeTodayYmd(now),
    venueId: "",
    lessonModeId: "",
    content: "",
    studentIds: [],
    nextBookingOpen: false,
    nextBookingChosen: false,
    nextBookingDate: "",
    nextBookingHour: "12",
    nextBookingMinute: "00",
    nextBookingDuration: "2",
  };
}

function isMinute(v: unknown): v is SessionLogDraft["nextBookingMinute"] {
  return v === "00" || v === "30";
}

function isDuration(v: unknown): v is SessionLogDraft["nextBookingDuration"] {
  return v === "1" || v === "2";
}

export function readSessionLogDraft(): SessionLogDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_LOG_DRAFT_KEY);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as Partial<SessionLogDraft>;
    const empty = createEmptySessionLogDraft();
    const studentIds = Array.isArray(parsed.studentIds)
      ? parsed.studentIds.filter((id): id is string => typeof id === "string")
      : empty.studentIds;
    return {
      sessionDate:
        typeof parsed.sessionDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.sessionDate)
          ? parsed.sessionDate
          : empty.sessionDate,
      venueId: typeof parsed.venueId === "string" ? parsed.venueId : empty.venueId,
      lessonModeId:
        typeof parsed.lessonModeId === "string" ? parsed.lessonModeId : empty.lessonModeId,
      content: typeof parsed.content === "string" ? parsed.content : empty.content,
      studentIds,
      nextBookingOpen: Boolean(parsed.nextBookingOpen),
      nextBookingChosen:
        typeof parsed.nextBookingChosen === "boolean"
          ? parsed.nextBookingChosen
          : typeof parsed.nextBookingDate === "string" && parsed.nextBookingDate.length > 0,
      nextBookingDate:
        typeof parsed.nextBookingDate === "string" ? parsed.nextBookingDate : empty.nextBookingDate,
      nextBookingHour:
        typeof parsed.nextBookingHour === "string" ? parsed.nextBookingHour : empty.nextBookingHour,
      nextBookingMinute: isMinute(parsed.nextBookingMinute)
        ? parsed.nextBookingMinute
        : empty.nextBookingMinute,
      nextBookingDuration: isDuration(parsed.nextBookingDuration)
        ? parsed.nextBookingDuration
        : empty.nextBookingDuration,
    };
  } catch {
    return null;
  }
}

export function writeSessionLogDraft(draft: SessionLogDraft) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_LOG_DRAFT_KEY, JSON.stringify(draft));
  localStorage.setItem(LAST_SESSION_STUDENT_IDS_KEY, JSON.stringify(draft.studentIds));
}

export function clearSessionLogDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_LOG_DRAFT_KEY);
  localStorage.removeItem(LAST_SESSION_STUDENT_IDS_KEY);
}
