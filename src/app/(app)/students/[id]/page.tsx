import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/guards";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (!student) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{student.name}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {student.phone ?? "未填手机号"}
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">备注</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
          {student.notes ?? "暂无备注。"}
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">上课记录</h2>
        <p className="mt-2 text-sm text-zinc-600">
          下一步会把该学员参与过的课程记录列表接上。
        </p>
      </section>
    </div>
  );
}

