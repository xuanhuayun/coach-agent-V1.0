"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/guards";
import { isPgRestMissingColumn } from "@/lib/session-queries";
import { requiredCountFromModeCode, resolveModeDurationHours } from "@/lib/lesson-mode";
import { fetchLessonModeById } from "@/lib/lesson-modes-server";
import { singaporeTodayYmd } from "@/lib/singapore-date";
import { toastUrl } from "@/lib/toast";

function ymdInSingaporeFromIso(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

function saveErrorMessage(error: unknown, fallback: string) {
  const msg = String((error as { message?: string })?.message ?? "").trim();
  const code = String((error as { code?: string })?.code ?? "").trim();
  if (!msg && !code) return fallback;
  return `保存失败：${code ? `[${code}] ` : ""}${msg || fallback}`;
}

const OPTIONAL_SESSION_COLUMNS = ["duration_hours", "next_booking_duration_hours"] as const;

function isMissingColumnError(error: unknown, column: string) {
  return (
    String((error as { code?: string })?.code ?? "") === "PGRST204" &&
    String((error as { message?: string })?.message ?? "").includes(column)
  );
}

async function insertSessionRow(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  payload: Record<string, unknown>,
) {
  let current = { ...payload };
  while (true) {
    const result = await supabase.from("sessions").insert(current).select("id").single();
    if (!result.error) return result;
    const missing = OPTIONAL_SESSION_COLUMNS.find(
      (column) => column in current && isPgRestMissingColumn(result.error, column),
    );
    if (!missing) return result;
    const { [missing]: _removed, ...rest } = current;
    current = rest;
  }
}

async function updateSessionRow(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  sessionId: string,
  payload: Record<string, unknown>,
) {
  let current = { ...payload };
  while (true) {
    const result = await supabase.from("sessions").update(current).eq("id", sessionId);
    if (!result.error) return result;
    const missing = OPTIONAL_SESSION_COLUMNS.find(
      (column) => column in current && isPgRestMissingColumn(result.error, column),
    );
    if (!missing) return result;
    const { [missing]: _removed, ...rest } = current;
    current = rest;
  }
}

export async function createSession(formData: FormData) {
  const sessionDate = String(formData.get("sessionDate") ?? "").trim();
  const venueId = String(formData.get("venueId") ?? "").trim();
  const modeId = String(formData.get("lessonModeId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const nextBookingChosen = String(formData.get("nextBookingChosen") ?? "").trim() === "1";
  const nextBookingAt = nextBookingChosen
    ? String(formData.get("nextBookingAt") ?? "").trim()
    : "";
  const nextBookingDurationHours = Number(formData.get("nextBookingDurationHours") ?? 2);

  const studentIds = formData.getAll("studentIds").map((v) => String(v));
  if (!sessionDate) {
    redirect(toastUrl("/sessions", "error", "上课日期必填。"));
  }
  if (sessionDate > singaporeTodayYmd()) {
    redirect(toastUrl("/sessions", "error", "上课日期不能晚于今天。"));
  }
  if (!modeId) {
    redirect(toastUrl("/sessions", "error", "上课模式必选。"));
  }

  const { supabase, user } = await requireUser();

  // Snapshot per-person price at the time of logging, so later mode price edits
  // won't retroactively change historical finance totals.
  const { data: mode, error: modeError } = await fetchLessonModeById(supabase, modeId);

  if (modeError || !mode) {
    redirect(toastUrl("/sessions", "error", saveErrorMessage(modeError, "找不到所选上课模式，请刷新后重试。")));
  }

  const modeCode = String((mode as { code?: string })?.code ?? "");
  const requiredCount = requiredCountFromModeCode(modeCode);
  if (!requiredCount || requiredCount < 1 || requiredCount > 4) {
    redirect(toastUrl("/sessions", "error", "上课模式不正确，请重新选择。"));
  }
  if (studentIds.length !== requiredCount) {
    redirect(
      toastUrl(
        "/sessions",
        "error",
        `该模式必须选择 ${requiredCount} 个学员（当前已选 ${studentIds.length} 个）。`,
      ),
    );
  }

  const priceCents: number | null =
    (mode as any)?.default_price_cents != null ? (mode as any).default_price_cents : null;

  let nextBookingIso: string | null = null;
  if (nextBookingAt) {
    const nextBookingDate = new Date(nextBookingAt);
    if (Number.isNaN(nextBookingDate.getTime())) {
      redirect(toastUrl("/sessions", "error", "下次约课时间格式不正确。"));
    }
    nextBookingIso = nextBookingDate.toISOString();
  }

  const sessionPayload: Record<string, unknown> = {
    user_id: user.id,
    session_date: sessionDate,
    venue_id: venueId || null,
    lesson_mode_id: modeId || null,
    price_cents: priceCents,
    content: content || null,
    improvements: null,
    remarks: null,
    next_booking_at: nextBookingIso,
    duration_hours: resolveModeDurationHours({
      code: modeCode,
      label: "",
      default_price_cents: Number((mode as { default_price_cents?: number })?.default_price_cents ?? 0),
      default_duration_hours: (mode as { default_duration_hours?: number | null })?.default_duration_hours,
    }),
  };
  if (
    nextBookingIso &&
    Number.isFinite(nextBookingDurationHours) &&
    nextBookingDurationHours > 0
  ) {
    sessionPayload.next_booking_duration_hours = nextBookingDurationHours;
  }

  const { data: created, error } = await insertSessionRow(supabase, sessionPayload);

  if (error || !created) {
    redirect(toastUrl("/sessions", "error", saveErrorMessage(error, "请稍后重试。")));
  }

  if (studentIds.length > 0) {
    const linkErr = await supabase.from("session_students").insert(
      studentIds.map((sid) => ({ session_id: created.id, student_id: sid })),
    );
    if (linkErr.error) {
      redirect(
        toastUrl(
          "/sessions",
          "error",
          saveErrorMessage(linkErr.error, "学员关联写入失败，请稍后重试。"),
        ),
      );
    }
  }

  revalidatePath("/sessions/new");
  revalidatePath("/sessions");
  revalidatePath("/revenue");
  redirect(toastUrl("/sessions", "success", "保存成功。"));
}

export async function logBookedSession(sessionId: string, formData: FormData) {
  const { supabase, user } = await requireUser();

  const content = String(formData.get("content") ?? "").trim();
  const improvements = String(formData.get("improvements") ?? "").trim();

  const { data: session } = await supabase
    .from("sessions")
    .select("id,user_id,lesson_mode_id,venue_id,next_booking_at,next_booking_duration_hours")
    .eq("id", sessionId)
    .single();

  if (!session || session.user_id !== user.id) {
    redirect(toastUrl("/sessions", "error", "找不到这条约课记录。"));
  }
  if (!session.next_booking_at) {
    redirect(toastUrl("/sessions", "error", "这条记录不是“已约课程”，无法从这里记录。"));
  }
  if (!session.lesson_mode_id) {
    redirect(toastUrl(`/sessions/log/${sessionId}`, "error", "缺少上课模式，请先去今日已约补齐。"));
  }

  const sessionDate = ymdInSingaporeFromIso(String(session.next_booking_at));
  if (!sessionDate) {
    redirect(toastUrl(`/sessions/log/${sessionId}`, "error", "约课时间格式不正确。"));
  }

  const { data: mode, error: modeError } = await fetchLessonModeById(
    supabase,
    String(session.lesson_mode_id),
  );
  if (modeError || !mode) {
    redirect(
      toastUrl(`/sessions/log/${sessionId}`, "error", saveErrorMessage(modeError, "找不到所选上课模式。")),
    );
  }
  const priceCents: number | null =
    (mode as { default_price_cents?: number | null })?.default_price_cents != null
      ? Number((mode as { default_price_cents?: number | null }).default_price_cents)
      : null;

  const durationHours = resolveModeDurationHours({
    code: String((mode as { code?: string }).code ?? ""),
    label: "",
    default_price_cents: Number((mode as { default_price_cents?: number })?.default_price_cents ?? 0),
    default_duration_hours: (mode as { default_duration_hours?: number | null })?.default_duration_hours,
  });

  const { error: upErr } = await updateSessionRow(supabase, sessionId, {
    session_date: sessionDate,
    price_cents: priceCents,
    content: content || null,
    improvements: improvements || null,
    remarks: null,
    duration_hours: durationHours,
    next_booking_at: null,
  });

  if (upErr) {
    redirect(
      toastUrl(`/sessions/log/${sessionId}`, "error", saveErrorMessage(upErr, "请稍后重试。")),
    );
  }

  // Per-student notes removed; keep session_students.improvements as null.

  revalidatePath("/bookings");
  revalidatePath("/sessions");
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/revenue");
  redirect(toastUrl("/sessions", "success", "已记录本节课。"));
}
