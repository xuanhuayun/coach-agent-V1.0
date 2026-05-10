import Link from "next/link";
import { requireUser } from "@/lib/supabase/guards";

export default async function StudentsPage() {
  const { supabase } = await requireUser();
  const { data: students } = await supabase
    .from("students")
    .select("id,name,phone,notes,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">学员</h1>
        <Link
          href="/students/new"
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          新增学员
        </Link>
      </div>
      <p className="mt-2 text-sm text-zinc-600">
        学员列表（可搜索/筛选），点击进入详情。
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {(students ?? []).length === 0 ? (
          <div className="p-6 text-sm text-zinc-600">还没有学员。</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {(students ?? []).map((s) => (
              <Link
                key={s.id}
                href={`/students/${s.id}`}
                className="block p-4 hover:bg-zinc-50"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">
                      {s.name}
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      {s.phone ?? "未填手机号"}
                      {s.notes ? ` · ${s.notes}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400">查看</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

