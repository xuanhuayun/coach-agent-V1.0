import { NextResponse } from "next/server";
import { getLang } from "@/lib/i18n-server";
import { buildSessionHistoryMonth } from "@/lib/session-history-month";
import { requireUser } from "@/lib/supabase/guards";

export async function GET(req: Request) {
  const { supabase } = await requireUser();
  const lang = await getLang();
  const month = new URL(req.url).searchParams.get("month")?.trim() ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "invalid_month" }, { status: 400 });
  }

  const payload = await buildSessionHistoryMonth(supabase, month, lang);
  return NextResponse.json(payload);
}
