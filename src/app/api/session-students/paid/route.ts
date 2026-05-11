import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/guards";
import { setSessionStudentPaid } from "@/lib/session-student-paid-state";

type Body = { sessionId?: string; studentId?: string; paid?: boolean };

export async function POST(req: Request) {
  const { supabase, user } = await requireUser();

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

  const result = await setSessionStudentPaid(supabase, user.id, { sessionId, studentId }, paid);
  if (!result.ok) {
    return NextResponse.json({ error: "update_failed", message: result.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
