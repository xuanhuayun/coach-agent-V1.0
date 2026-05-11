import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/guards";
import { safeInternalPath } from "@/lib/safe-return-path";
import { toastUrl } from "@/lib/toast";

async function createStudent(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const returnTo = safeInternalPath(String(formData.get("returnTo") ?? ""));
  if (!name) {
    redirect(toastUrl("/students/new", "error", "姓名必填。"));
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("students")
    .insert({
      user_id: user.id,
      name,
      phone: phone || null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(toastUrl("/students/new", "error", "创建失败，请稍后重试。"));
  }

  revalidatePath("/students");
  revalidatePath("/sessions/new");
  revalidatePath("/sessions");
  if (returnTo) redirect(toastUrl(returnTo, "success", "创建成功。"));
  redirect(toastUrl(`/students/${data.id}`, "success", "创建成功。"));
}

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const sp = await searchParams;
  const returnTo = safeInternalPath(sp.returnTo) ?? "";

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold tracking-tight">+ 学员</h1>
      <p className="mt-2 text-sm text-slate-600/90">先创建学员基本信息。</p>
      {returnTo.startsWith("/sessions") && (
        <p className="mt-2 text-xs text-slate-500">
          创建成功后将返回记课页，新学员会出现在列表中（可搜索勾选）。
        </p>
      )}

      <form
        action={createStudent}
        className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
      >
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <div>
          <label className="block text-sm font-medium text-slate-900">姓名</label>
          <input
            name="name"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
            placeholder="例如：小明"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-900">
            手机（可选）
          </label>
          <input
            name="phone"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
            placeholder="例如：138xxxx"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-900">
            备注（可选）
          </label>
          <textarea
            name="notes"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
            placeholder="例如：反手需要加强、脚步慢"
            rows={4}
          />
        </div>

        <button className="rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 shadow-md shadow-sky-900/15 px-4 py-2 text-sm font-medium text-white">
          创建
        </button>
      </form>
    </div>
  );
}

