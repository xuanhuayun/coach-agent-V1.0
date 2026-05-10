import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { sessionDurationHours } from "@/lib/lesson";
import { InfoTip } from "@/components/InfoTip";
import { toastUrl } from "@/lib/toast";

type SessionRow = {
  id: string;
  date: string;
  venueName: string;
  venueAddress: string | null;
  modeLabel: string;
  perPersonCents: number;
  headcount: number;
  revenueCents: number;
  durationHours: number;
  content: string | null;
  improvements: string | null;
};

async function updateStudent(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!id || !name) {
    redirect(toastUrl(`/students/${id || ""}`, "error", "姓名必填。"));
  }

  const { supabase } = await requireUser();
  await supabase
    .from("students")
    .update({
      name,
      phone: phone || null,
      notes: notes || null,
    })
    .eq("id", id);

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  redirect(toastUrl(`/students/${id}`, "success", "保存成功。"));
}

async function deleteStudent(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const { supabase } = await requireUser();
  const { data: anyLink } = await supabase
    .from("session_students")
    .select("session_id")
    .eq("student_id", id)
    .limit(1);

  if ((anyLink ?? []).length > 0) {
    redirect(toastUrl(`/students/${id}`, "error", "已有上课记录，不能删除。"));
  }

  await supabase.from("students").delete().eq("id", id);
  revalidatePath("/students");
  redirect(toastUrl("/students", "success", "已删除。"));
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ err?: string; ok?: string; toast?: string; msg?: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const lang = await getLang();
  const d = dict[lang];
  const sp = (await searchParams) ?? {};

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (!student) notFound();

  const { data: links } = await supabase
    .from("session_students")
    .select("session_id,improvements")
    .eq("student_id", id);

  const sessionIds = (links ?? []).map((l: any) => l.session_id).filter(Boolean);
  const improvementsBySession = new Map<string, string | null>();
  (links ?? []).forEach((l: any) => {
    if (l.session_id) improvementsBySession.set(l.session_id, l.improvements ?? null);
  });
  const canDelete = sessionIds.length === 0;

  const { data: sessions } =
    sessionIds.length > 0
      ? await supabase
          .from("sessions")
          .select(
            "id,session_date,price_cents,duration_hours,content,improvements, venues(name,address), lesson_modes(code,label,default_price_cents)",
          )
          .in("id", sessionIds)
          .order("session_date", { ascending: false })
          .order("id", { ascending: false })
      : { data: [] as any[] };

  const { data: ssAll } =
    sessionIds.length > 0
      ? await supabase
          .from("session_students")
          .select("session_id")
          .in("session_id", sessionIds)
      : { data: [] as any[] };

  const attendance = new Map<string, number>();
  (ssAll ?? []).forEach((r: any) => {
    attendance.set(r.session_id, (attendance.get(r.session_id) ?? 0) + 1);
  });

  const rows: SessionRow[] = (sessions ?? []).map((s: any) => {
    const mode = s.lesson_modes;
    const perPersonCents = s.price_cents ?? mode?.default_price_cents ?? 0;
    const headcount = attendance.get(s.id) ?? 0;
    const revenueCents = perPersonCents * headcount;
    return {
      id: s.id,
      date: s.session_date,
      venueName: s.venues?.name ?? (lang === "zh" ? "（未填场地）" : "(No venue)"),
      venueAddress: s.venues?.address ?? null,
      modeLabel: mode
        ? `${mode.code} · ${mode.label}`
        : lang === "zh"
          ? "（未填模式）"
          : "(No mode)",
      perPersonCents,
      headcount,
      revenueCents,
      durationHours: sessionDurationHours(s),
      content: s.content ?? null,
      improvements: improvementsBySession.get(s.id) ?? null,
    };
  });

  const byDate = new Map<string, SessionRow[]>();
  for (const r of rows) {
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }
  const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
  for (const k of dates) {
    const list = byDate.get(k) ?? [];
    list.sort((a, b) => b.id.localeCompare(a.id));
    byDate.set(k, list);
  }

  const totalHours = rows.reduce((a, r) => a + r.durationHours, 0);

  return (
    <div className="max-w-3xl space-y-6">
      {sp.err === "has_sessions" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          {lang === "zh"
            ? "这个学员已经有上课记录，为了保证历史数据完整，暂时不能删除。"
            : "This student has class history and cannot be deleted."}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/students"
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            ← {d.nav_students}
          </Link>
          <h1 className="mt-2 text-sm font-semibold tracking-tight">
            {lang === "zh" ? "学员详情" : "Student detail"}
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-500">
              {lang === "zh" ? "累计（参与课次）" : "Sessions"}
            </div>
            <div className="text-lg font-semibold">{rows.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-500">
              {lang === "zh" ? "累计课时" : "Total hours"}
            </div>
            <div className="text-lg font-semibold">{totalHours}</div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {lang === "zh" ? "个人信息" : "Profile"}
          </h2>
          <div className="flex items-center gap-2">
            <form action={deleteStudent}>
              <input type="hidden" name="id" value={student.id} />
              <button
                type="submit"
                disabled={!canDelete}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[12px] font-bold leading-none ${
                  canDelete
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
                }`}
                aria-label={lang === "zh" ? "删除学员" : "Delete student"}
                title={lang === "zh" ? "删除学员" : "Delete student"}
              >
                ×
              </button>
            </form>
            {!canDelete && (
              <InfoTip
                side="top"
                text={
                  lang === "zh"
                    ? "有上课记录的学员不能删除（避免影响历史课程与统计）。"
                    : "Students with class history can’t be deleted."
                }
              />
            )}
          </div>
        </div>
        {/* Avatar removed */}
        <form action={updateStudent} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={student.id} />
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-slate-500">
              {lang === "zh" ? "姓名" : "Name"}
            </label>
            <input
              name="name"
              defaultValue={student.name}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-slate-500">
              {lang === "zh" ? "手机号" : "Phone"}
            </label>
            <input
              name="phone"
              defaultValue={student.phone ?? ""}
              placeholder={lang === "zh" ? "可选" : "Optional"}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500">
              {lang === "zh" ? "备注" : "Notes"}
            </label>
            <textarea
              name="notes"
              defaultValue={student.notes ?? ""}
              rows={3}
              placeholder=""
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              aria-label={lang === "zh" ? "保存" : "Save"}
              title={lang === "zh" ? "保存" : "Save"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-base font-bold leading-none text-emerald-700 shadow-sm hover:bg-emerald-100"
            >
              ✓
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">
          {lang === "zh" ? "上课记录" : "Session history"}
        </h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600/90">
            {lang === "zh"
              ? "Ta 还没有上课记录～下次上完课记一节，很快就能看到轨迹啦。"
              : "No sessions yet."}
          </p>
        ) : (
          <div className="mt-4 space-y-8">
            {dates.map((date) => {
              const list = byDate.get(date) ?? [];
              const dayRev = list.reduce((s, r) => s + r.revenueCents, 0);
              const dayHrs = list.reduce((s, r) => s + r.durationHours, 0);
              return (
                <div key={date}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="text-sm font-medium text-slate-900">{date}</div>
                    <div className="text-xs text-slate-600/90">
                      {lang === "zh" ? "当日" : "Day"}: S$
                      {(dayRev / 100).toFixed(0)} · {dayHrs}h
                    </div>
                  </div>
                  <ul className="mt-3 space-y-4">
                    {list.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <div className="text-xs text-slate-500">
                              <span className="font-semibold text-slate-700/90">
                                {lang === "zh" ? "日期" : "Date"}:
                              </span>{" "}
                              {r.date}
                            </div>
                            <div className="text-xs text-slate-500">
                              <span className="font-semibold text-slate-700/90">
                                {lang === "zh" ? "模式" : "Mode"}:
                              </span>{" "}
                              <span className="text-sm font-medium text-slate-900">
                                {r.modeLabel}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              <span className="font-semibold text-slate-700/90">
                                {lang === "zh" ? "场地" : "Venue"}:
                              </span>{" "}
                              {r.venueName}
                              {r.venueAddress ? (
                                <span className="block pl-0 text-slate-600/90 sm:inline sm:pl-1">
                                  {r.venueAddress}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-slate-500">
                              {lang === "zh"
                                ? `${r.headcount}人到课`
                                : `${r.headcount} present`}{" "}
                              · S${Math.round(r.perPersonCents / 100)}/
                              {lang === "zh" ? "人" : "person"}
                            </div>
                            <Link
                              href={`/sessions/${r.id}`}
                              className="inline-block pt-1 text-xs font-semibold text-slate-600 underline decoration-slate-400 underline-offset-2 hover:text-slate-800"
                            >
                              {d.view_session_detail_link}
                            </Link>
                          </div>
                          <div className="text-right text-sm font-medium text-slate-900">
                            <div>S${(r.revenueCents / 100).toFixed(0)}</div>
                            <div className="text-xs font-normal text-slate-500">
                              {r.durationHours}h
                            </div>
                          </div>
                        </div>
                        {(r.content || r.improvements) && (
                          <div className="mt-3 space-y-1 text-xs text-slate-800/90">
                            {r.content && (
                              <p>
                                <span className="font-medium text-slate-900">
                                  {lang === "zh" ? "内容" : "Content"}:{" "}
                                </span>
                                {r.content}
                              </p>
                            )}
                            {r.improvements && (
                              <p>
                                <span className="font-medium text-slate-900">
                                  {lang === "zh" ? "改进" : "Focus"}:{" "}
                                </span>
                                {r.improvements}
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
