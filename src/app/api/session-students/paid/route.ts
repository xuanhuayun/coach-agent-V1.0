import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/guards";

type Body = { sessionId?: string; studentId?: string; paid?: boolean };

export async function POST(req: Request) {
  const { supabase } = await requireUser();

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const sessionId = String(body.sessionId ?? "").trim();
  const studentId = String(body.studentId ?? "").trim();
  const paid = Boolean(body.paid);
  if (!sessionId || !studentId) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const { error } = await supabase
    .from("session_students")
    .update({ paid })
    .eq("session_id", sessionId)
    .eq("student_id", studentId);

  if (error) {
    const msg = String((error as any)?.message ?? "");
    if ((error as any)?.code === "PGRST204" || msg.toLowerCase().includes("paid")) {
      return NextResponse.json(
        {
          error: "missing_paid_column",
          message:
            "数据库缺少 paid 字段。请执行迁移 `20260510_add_session_student_paid.sql` 后再使用已付款功能。",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "update_failed", message: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

