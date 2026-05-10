import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/guards";

async function createStudent(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!name) return;

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

  if (error || !data) return;

  revalidatePath("/students");
  redirect(`/students/${data.id}`);
}

export default function NewStudentPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">新增学员</h1>
      <p className="mt-2 text-sm text-zinc-600">先创建学员基本信息。</p>

      <form
        action={createStudent}
        className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6"
      >
        <div>
          <label className="block text-sm font-medium text-zinc-900">姓名</label>
          <input
            name="name"
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            placeholder="例如：小明"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-900">
            手机（可选）
          </label>
          <input
            name="phone"
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            placeholder="例如：138xxxx"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-900">
            备注（可选）
          </label>
          <textarea
            name="notes"
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            placeholder="例如：反手需要加强、脚步慢"
            rows={4}
          />
        </div>

        <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          创建
        </button>
      </form>
    </div>
  );
}

