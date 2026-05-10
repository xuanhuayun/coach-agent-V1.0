import { requireUser } from "@/lib/supabase/guards";

function monthRange(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export default async function RevenuePage() {
  const { supabase } = await requireUser();
  const { start, end } = monthRange(new Date());

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id,session_date,price_cents,venue_id,lesson_mode_id, venues(name), lesson_modes(code,label,default_price_cents)",
    )
    .gte("session_date", start.toISOString().slice(0, 10))
    .lt("session_date", end.toISOString().slice(0, 10))
    .order("session_date", { ascending: false });

  const rows = (sessions ?? []).map((s: any) => {
    const mode = s.lesson_modes;
    const effectiveCents =
      s.price_cents ?? mode?.default_price_cents ?? 0;
    return {
      id: s.id,
      date: s.session_date,
      venueName: s.venues?.name ?? "（未填场地）",
      modeLabel: mode ? `${mode.code} · ${mode.label}` : "（未填模式）",
      cents: effectiveCents,
    };
  });

  const totalCents = rows.reduce((acc, r) => acc + (r.cents ?? 0), 0);

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold tracking-tight">当月收入</h1>
      <p className="mt-2 text-sm text-zinc-600">
        统计本月上课次数与收入（按场地/模式/学员）。
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="text-xs text-zinc-500">本月课次</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            {rows.length}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="text-xs text-zinc-500">本月收入</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            ¥{(totalCents / 100).toFixed(0)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="text-xs text-zinc-500">统计区间</div>
          <div className="mt-2 text-sm font-medium text-zinc-900">
            {start.toISOString().slice(0, 10)} ~{" "}
            {new Date(end.getTime() - 1).toISOString().slice(0, 10)}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {rows.length === 0 ? (
          <div className="p-6 text-sm text-zinc-600">
            本月还没有课程记录。去“课后记录”里新增一条试试。
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">
                    {r.date} · {r.modeLabel}
                  </div>
                  <div className="truncate text-xs text-zinc-500">
                    {r.venueName}
                  </div>
                </div>
                <div className="text-sm font-medium text-zinc-900">
                  ¥{Math.round(r.cents / 100)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

