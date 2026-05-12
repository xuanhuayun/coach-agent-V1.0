import { NextResponse } from "next/server";
import { fetchStudentListPage } from "@/lib/students-list-page";
import { requireUser } from "@/lib/supabase/guards";

export async function GET(req: Request) {
  const { supabase } = await requireUser();
  const url = new URL(req.url);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const page = await fetchStudentListPage(supabase, { offset, limit });
  return NextResponse.json(page);
}
