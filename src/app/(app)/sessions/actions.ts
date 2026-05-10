"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/guards";
import { DEFAULT_LESSON_HOURS } from "@/lib/lesson";
import { toastUrl } from "@/lib/toast";

function ymdInSingaporeFromIso(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

export async function createSession(formData: FormData) {
  const sessionDate = String(formData.get("sessionDate") ?? "").trim();
  const venueId = String(formData.get("venueId") ?? "").trim();
  const modeId = String(formData.get("lessonModeId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const nextBookingAt = String(formData.get("nextBookingAt") ?? "").trim();
  const nextBookingDurationHours = Number(formData.get("nextBookingDurationHours") ?? 2);

  const studentIds = formData.getAll("studentIds").map((v) => String(v));
  if (!sessionDate) {
    redirect(toastUrl("/sessions", "error", "上课日期必填。"));
  }
  if (!modeId) {
    redirect(toastUrl("/sessions", "error", "上课模式必选。"));
  }

  const { supabase, user } = await requireUser();

  // Snapshot per-person price at the time of logging, so later mode price edits
  // won't retroactively change historical finance totals.
  const { data: mode } = await supabase
    .from("lesson_modes")
    .select("code,default_price_cents")
    .eq("id", modeId)
    .single();

  const modeCode = String((mode as any)?.code ?? "");
  const m = /^1:(\\d)$/.exec(modeCode);
  const requiredCount = m ? Number(m[1]) : null;
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

  const { data: created, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      session_date: sessionDate,
      venue_id: venueId || null,
      lesson_mode_id: modeId || null,
      price_cents: priceCents,
      content: content || null,
          improvements: null,
          remarks: null,
      next_booking_at: nextBookingAt ? new Date(nextBookingAt).toISOString() : null,
      next_booking_duration_hours:
        nextBookingAt && Number.isFinite(nextBookingDurationHours) && nextBookingDurationHours > 0
          ? nextBookingDurationHours
          : 2,
      duration_hours: DEFAULT_LESSON_HOURS,
    })
    .select("id")
    .single();

  if (error || !created) {
    redirect(toastUrl("/sessions", "error", "保存失败，请稍后重试。"));
  }

  if (studentIds.length > 0) {
    await supabase.from("session_students").insert(
      studentIds.map((sid) => ({ session_id: created.id, student_id: sid })),
    );
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

  const { data: mode } = await supabase
    .from("lesson_modes")
    .select("default_price_cents")
    .eq("id", session.lesson_mode_id)
    .single();
  const priceCents: number | null =
    (mode as any)?.default_price_cents != null ? (mode as any).default_price_cents : null;

  const durationHours =
    Number.isFinite(Number(session.next_booking_duration_hours)) && Number(session.next_booking_duration_hours) > 0
      ? Number(session.next_booking_duration_hours)
      : DEFAULT_LESSON_HOURS;

  const { error: upErr } = await supabase
    .from("sessions")
    .update({
      session_date: sessionDate,
      price_cents: priceCents,
      content: content || null,
      improvements: improvements || null,
      remarks: null,
      duration_hours: durationHours,
      next_booking_at: null, // recorded; remove from bookings list
    })
    .eq("id", sessionId);

  if (upErr) {
    redirect(toastUrl(`/sessions/log/${sessionId}`, "error", "保存失败，请稍后重试。"));
  }

  // Per-student notes removed; keep session_students.improvements as null.

  revalidatePath("/bookings");
  revalidatePath("/sessions");
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/revenue");
  redirect(toastUrl("/sessions", "success", "已记录本节课。"));
}
