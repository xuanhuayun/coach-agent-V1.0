"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/guards";
import { toastUrl } from "@/lib/toast";

function ymdInSingaporeFromIso(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // YYYY-MM-DD in Asia/Singapore
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

export async function updateBooking(formData: FormData) {
  const { supabase, user } = await requireUser();

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const venueId = String(formData.get("venueId") ?? "").trim();
  const modeId = String(formData.get("lessonModeId") ?? "").trim();
  const nextBookingAt = String(formData.get("nextBookingAt") ?? "").trim();
  const nextBookingDurationHours = Number(formData.get("nextBookingDurationHours") ?? 2);
  const remarks = String(formData.get("remarks") ?? "").trim();
  const studentIds = formData.getAll("studentIds").map((v) => String(v)).filter(Boolean);

  if (!sessionId) {
    redirect(toastUrl("/bookings", "error", "参数不完整。"));
  }
  if (!modeId) {
    redirect(toastUrl(`/bookings/${sessionId}`, "error", "上课模式必选。"));
  }
  if (!nextBookingAt) {
    redirect(toastUrl(`/bookings/${sessionId}`, "error", "约课时间必填。"));
  }
  if (!Number.isFinite(nextBookingDurationHours) || nextBookingDurationHours <= 0) {
    redirect(toastUrl(`/bookings/${sessionId}`, "error", "时长不正确。"));
  }
  if (studentIds.length === 0) {
    redirect(toastUrl(`/bookings/${sessionId}`, "error", "请至少选择 1 位学员。"));
  }

  const bookingIso = new Date(nextBookingAt).toISOString();
  const sessionDate = ymdInSingaporeFromIso(bookingIso);
  if (!sessionDate) {
    redirect(toastUrl(`/bookings/${sessionId}`, "error", "约课时间格式不正确。"));
  }

  // Authoritative conflict check: exclude itself.
  {
    const start = new Date(bookingIso);
    const durH =
      Number.isFinite(nextBookingDurationHours) && nextBookingDurationHours > 0 ? nextBookingDurationHours : 2;
    const end = new Date(start.getTime() + durH * 3600_000);
    const windowStartIso = new Date(start.getTime() - 24 * 3600_000).toISOString();
    const windowEndIso = new Date(end.getTime() + 24 * 3600_000).toISOString();

    let candidates: any[] = [];
    const q1 = await supabase
      .from("sessions")
      .select("id,next_booking_at,next_booking_duration_hours")
      .eq("user_id", user.id)
      .not("next_booking_at", "is", null)
      .gte("next_booking_at", windowStartIso)
      .lt("next_booking_at", windowEndIso);
    if (!q1.error) {
      candidates = q1.data ?? [];
    } else {
      const q2 = await supabase
        .from("sessions")
        .select("id,next_booking_at")
        .eq("user_id", user.id)
        .not("next_booking_at", "is", null)
        .gte("next_booking_at", windowStartIso)
        .lt("next_booking_at", windowEndIso);
      candidates = q2.data ?? [];
    }

    const conflicts = (candidates ?? []).filter((r: any) => {
      if (String(r.id) === sessionId) return false;
      const s = new Date(String(r.next_booking_at));
      if (Number.isNaN(s.getTime())) return false;
      const h = Number(r.next_booking_duration_hours ?? 2) || 2;
      const e = new Date(s.getTime() + h * 3600_000);
      return s < end && start < e;
    });

    if (conflicts.length > 0) {
      redirect(toastUrl(`/bookings/${sessionId}`, "error", `约课时间冲突：该时间段已有 ${conflicts.length} 条约课。`));
    }
  }

  // Update session row (duration column may not exist in older schema).
  const payload: Record<string, any> = {
    venue_id: venueId || null,
    lesson_mode_id: modeId || null,
    remarks: remarks || null,
    next_booking_at: bookingIso,
    session_date: sessionDate,
  };

  let up = await supabase.from("sessions").update({ ...payload, next_booking_duration_hours: nextBookingDurationHours }).eq("id", sessionId);
  if ((up.error as any)?.code === "PGRST204" && String((up.error as any)?.message ?? "").includes("next_booking_duration_hours")) {
    up = await supabase.from("sessions").update(payload).eq("id", sessionId);
  }
  if (up.error) {
    const msg = String((up.error as any)?.message ?? "");
    const code = String((up.error as any)?.code ?? "");
    redirect(toastUrl(`/bookings/${sessionId}`, "error", `保存失败：${code ? `[${code}] ` : ""}${msg || "请稍后再试。"}`));
  }

  // Replace session_students links.
  const del = await supabase.from("session_students").delete().eq("session_id", sessionId);
  if (del.error) {
    const msg = String((del.error as any)?.message ?? "");
    const code = String((del.error as any)?.code ?? "");
    redirect(toastUrl(`/bookings/${sessionId}`, "error", `保存失败：学员关联更新失败。${code ? ` [${code}]` : ""} ${msg || ""}`.trim()));
  }

  const rows = studentIds.map((sid) => ({ session_id: sessionId, student_id: sid }));
  const ins = await supabase.from("session_students").insert(rows);
  if (ins.error) {
    const msg = String((ins.error as any)?.message ?? "");
    const code = String((ins.error as any)?.code ?? "");
    redirect(toastUrl(`/bookings/${sessionId}`, "error", `保存失败：学员关联写入失败。${code ? ` [${code}]` : ""} ${msg || ""}`.trim()));
  }

  redirect(toastUrl(`/bookings/${sessionId}`, "success", "已保存修改。"));
}

export async function createBooking(formData: FormData) {
  const { supabase, user } = await requireUser();

  const venueId = String(formData.get("venueId") ?? "").trim();
  const modeId = String(formData.get("lessonModeId") ?? "").trim();
  const nextBookingAt = String(formData.get("nextBookingAt") ?? "").trim();
  const nextBookingDurationHours = Number(formData.get("nextBookingDurationHours") ?? 2);
  const remarks = String(formData.get("remarks") ?? "").trim();
  const override = String(formData.get("override") ?? "").trim() === "1";
  const overrideIdsRaw = String(formData.get("overrideIds") ?? "").trim();
  const overrideIds = overrideIdsRaw
    ? overrideIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const studentIds = formData.getAll("studentIds").map((v) => String(v)).filter(Boolean);

  if (!modeId) {
    redirect(toastUrl("/bookings", "error", "上课模式必选。"));
  }
  if (!nextBookingAt) {
    redirect(toastUrl("/bookings", "error", "约课时间必填。"));
  }
  if (!Number.isFinite(nextBookingDurationHours) || nextBookingDurationHours <= 0) {
    redirect(toastUrl("/bookings", "error", "时长不正确。"));
  }
  if (studentIds.length === 0) {
    redirect(toastUrl("/bookings", "error", "请至少选择 1 位学员。"));
  }

  const bookingIso = new Date(nextBookingAt).toISOString();
  const sessionDate = ymdInSingaporeFromIso(bookingIso);
  if (!sessionDate) {
    redirect(toastUrl("/bookings", "error", "约课时间格式不正确。"));
  }

  // Server-side conflict check (authoritative): no overlaps allowed for this coach.
  {
    const start = new Date(bookingIso);
    const durH = Number.isFinite(nextBookingDurationHours) && nextBookingDurationHours > 0 ? nextBookingDurationHours : 2;
    const end = new Date(start.getTime() + durH * 3600_000);
    const windowStartIso = new Date(start.getTime() - 24 * 3600_000).toISOString();
    const windowEndIso = new Date(end.getTime() + 24 * 3600_000).toISOString();

    let candidates: any[] = [];
    const q1 = await supabase
      .from("sessions")
      .select("id,next_booking_at,next_booking_duration_hours")
      .eq("user_id", user.id)
      .not("next_booking_at", "is", null)
      .gte("next_booking_at", windowStartIso)
      .lt("next_booking_at", windowEndIso);
    if (!q1.error) {
      candidates = q1.data ?? [];
    } else {
      // Backward-compatible: if duration column doesn't exist yet.
      const q2 = await supabase
        .from("sessions")
        .select("id,next_booking_at")
        .eq("user_id", user.id)
        .not("next_booking_at", "is", null)
        .gte("next_booking_at", windowStartIso)
        .lt("next_booking_at", windowEndIso);
      candidates = q2.data ?? [];
    }

    const conflicts = (candidates ?? []).filter((r: any) => {
      const s = new Date(String(r.next_booking_at));
      if (Number.isNaN(s.getTime())) return false;
      const h = Number(r.next_booking_duration_hours ?? 2) || 2;
      const e = new Date(s.getTime() + h * 3600_000);
      return s < end && start < e;
    });

    if (conflicts.length > 0) {
      redirect(toastUrl("/bookings", "error", `约课时间冲突：该时间段已有 ${conflicts.length} 条约课。`));
    }
  }

  if (override && overrideIds.length > 0) {
    await supabase
      .from("sessions")
      .update({ next_booking_at: null })
      .eq("user_id", user.id)
      .in("id", overrideIds);
  }

  const { data: created, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      session_date: sessionDate,
      venue_id: venueId || null,
      lesson_mode_id: modeId || null,
      content: null,
      improvements: null,
      remarks: remarks || null,
      next_booking_at: bookingIso,
      next_booking_duration_hours: nextBookingDurationHours,
    })
    .select("id")
    .single();

  if ((error as any)?.code === "PGRST204" && String((error as any)?.message ?? "").includes("next_booking_duration_hours")) {
    const retry = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        session_date: sessionDate,
        venue_id: venueId || null,
        lesson_mode_id: modeId || null,
        content: null,
        improvements: null,
        remarks: remarks || null,
        next_booking_at: bookingIso,
      })
      .select("id")
      .single();
    if (!retry.error && retry.data?.id) {
      const rows = studentIds.map((sid) => ({ session_id: retry.data.id, student_id: sid }));
      const { error: linkErr } = await supabase.from("session_students").insert(rows);
      if (linkErr) {
        const msg = String((linkErr as any)?.message ?? "");
        const code = String((linkErr as any)?.code ?? "");
        redirect(
          toastUrl(
            "/bookings",
            "error",
            `保存失败：学员关联写入失败。${code ? ` [${code}]` : ""} ${msg || ""}`.trim(),
          ),
        );
      }
      redirect(toastUrl("/bookings", "success", "已保存今日约课。"));
    }
  }

  if (error || !created?.id) {
    const msg = String((error as any)?.message ?? "");
    const code = String((error as any)?.code ?? "");
    redirect(
      toastUrl(
        "/bookings",
        "error",
        `保存失败：${code ? `[${code}] ` : ""}${msg || "请稍后再试。"}`,
      ),
    );
  }

  // Insert the minimal columns for maximum DB compatibility.
  const rows = studentIds.map((sid) => ({ session_id: created.id, student_id: sid }));

  const { error: linkErr } = await supabase.from("session_students").insert(rows);
  if (linkErr) {
    // best-effort cleanup is skipped to avoid lock trigger surprises; toast is enough.
    const msg = String((linkErr as any)?.message ?? "");
    if (
      msg.toLowerCase().includes("paid") ||
      msg.toLowerCase().includes("improvements") ||
      msg.toLowerCase().includes("column")
    ) {
      redirect(
        toastUrl(
          "/bookings",
          "error",
          "保存失败：数据库还没更新（字段缺失）。请先执行迁移 `20260510_add_session_student_improvements.sql`（以及如需要的话 `20260510_add_session_student_paid.sql`）。",
        ),
      );
    }
    const code = String((linkErr as any)?.code ?? "");
    redirect(
      toastUrl(
        "/bookings",
        "error",
        `保存失败：学员关联写入失败。${code ? ` [${code}]` : ""} ${msg || ""}`.trim(),
      ),
    );
  }

  redirect(toastUrl("/bookings", "success", "已保存今日约课。"));
}

export async function toggleBookingPaid(formData: FormData) {
  const { supabase } = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const paidRaw = String(formData.get("paid") ?? "").trim();
  const paid = paidRaw === "1" || paidRaw === "true" || paidRaw === "on";

  if (!sessionId || !studentId) {
    redirect(toastUrl("/bookings", "error", "参数不完整。"));
  }

  const { error } = await supabase
    .from("session_students")
    .update({ paid })
    .eq("session_id", sessionId)
    .eq("student_id", studentId);

  if (error) {
    const msg = String((error as any)?.message ?? "");
    if (msg.toLowerCase().includes("paid") || msg.toLowerCase().includes("column")) {
      redirect(
        toastUrl(
          "/bookings",
          "error",
          "更新失败：数据库还没更新（字段缺失）。请执行迁移 `20260510_add_session_student_paid.sql`，或先不使用“已付费”。",
        ),
      );
    }
    redirect(toastUrl("/bookings", "error", "更新失败，请稍后再试。"));
  }

  redirect(toastUrl("/bookings", "success", paid ? "已标记：已付费" : "已标记：未付费"));
}

