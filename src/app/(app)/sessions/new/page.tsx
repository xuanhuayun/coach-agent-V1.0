import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/guards";

async function createSession(formData: FormData) {
  "use server";
  const sessionDate = String(formData.get("sessionDate") ?? "").trim();
  const venueId = String(formData.get("venueId") ?? "").trim();
  const modeId = String(formData.get("lessonModeId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const improvements = String(formData.get("improvements") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim();
  const nextBookingAt = String(formData.get("nextBookingAt") ?? "").trim();

  const studentIds = formData.getAll("studentIds").map((v) => String(v));
  if (!sessionDate) return;

  const { supabase, user } = await requireUser();

  const { data: created, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      session_date: sessionDate,
      venue_id: venueId || null,
      lesson_mode_id: modeId || null,
      content: content || null,
      improvements: improvements || null,
      remarks: remarks || null,
      next_booking_at: nextBookingAt ? new Date(nextBookingAt).toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !created) return;

  if (studentIds.length > 0) {
    await supabase.from("session_students").insert(
      studentIds.map((sid) => ({
        session_id: created.id,
        student_id: sid,
      })),
    );
  }

  revalidatePath("/sessions/new");
  revalidatePath("/revenue");
  redirect("/sessions/new");
}

export default async function NewSessionPage() {
  const { supabase } = await requireUser();
  const [{ data: venues }, { data: modes }, { data: students }] =
    await Promise.all([
      supabase
        .from("venues")
        .select("id,name")
        .order("created_at", { ascending: false }),
      supabase
        .from("lesson_modes")
        .select("id,code,label,default_price_cents")
        .order("code", { ascending: true }),
      supabase
        .from("students")
        .select("id,name")
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">课后记录</h1>
      <p className="mt-2 text-sm text-zinc-600">
        这里将用于输入当天课程内容、上课学员、地点、改进点/备注、下次约课时间。
      </p>

      <form
        action={createSession}
        className="mt-6 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-zinc-900">
              上课日期
            </label>
            <input
              type="date"
              name="sessionDate"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-900">
              场地
            </label>
            <select
              name="venueId"
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
              defaultValue=""
            >
              <option value="">（不选）</option>
              {(venues ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-900">
              上课模式
            </label>
            <select
              name="lessonModeId"
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
              defaultValue=""
            >
              <option value="">（不选）</option>
              {(modes ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} · {m.label}（{Math.round(m.default_price_cents / 100)}元）
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-900">
            上课学员
          </label>
          {(students ?? []).length === 0 ? (
            <div className="mt-2 text-sm text-zinc-600">
              还没有学员，请先去“学员”里新增。
            </div>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(students ?? []).map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
                >
                  <input
                    type="checkbox"
                    name="studentIds"
                    value={s.id}
                    className="h-4 w-4"
                  />
                  <span className="truncate">{s.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-900">
              今日课程内容
            </label>
            <textarea
              name="content"
              rows={5}
              className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              placeholder="例如：高远球、网前搓球、步伐分解..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-900">
              改进点 / 备注
            </label>
            <textarea
              name="improvements"
              rows={5}
              className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              placeholder="例如：反手发力、起跳时机..."
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-900">
              其他备注（可选）
            </label>
            <input
              name="remarks"
              className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              placeholder="例如：学员迟到10分钟"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-900">
              下次约课时间（可选）
            </label>
            <input
              type="datetime-local"
              name="nextBookingAt"
              className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          保存本次记录
        </button>
      </form>
    </div>
  );
}

