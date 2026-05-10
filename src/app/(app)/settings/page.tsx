import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/guards";

async function createVenue(formData: FormData) {
  "use server";
  const name = String(formData.get("venueName") ?? "").trim();
  const address = String(formData.get("venueAddress") ?? "").trim();
  if (!name) return;

  const { supabase, user } = await requireUser();
  await supabase.from("venues").insert({
    user_id: user.id,
    name,
    address: address || null,
  });
  revalidatePath("/settings");
}

async function deleteVenue(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase } = await requireUser();
  await supabase.from("venues").delete().eq("id", id);
  revalidatePath("/settings");
}

async function upsertLessonMode(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  if (!code || !label || Number.isNaN(price) || price < 0) return;

  const { supabase, user } = await requireUser();
  await supabase.from("lesson_modes").upsert(
    {
      user_id: user.id,
      code,
      label,
      default_price_cents: Math.round(price * 100),
    },
    { onConflict: "user_id,code" },
  );
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const { supabase } = await requireUser();

  const [{ data: venues }, { data: modes }] = await Promise.all([
    supabase.from("venues").select("*").order("created_at", { ascending: false }),
    supabase
      .from("lesson_modes")
      .select("*")
      .order("code", { ascending: true }),
  ]);

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">设置</h1>
        <p className="mt-2 text-sm text-zinc-600">
          设置场地列表、上课模式价格（1:1 / 1:2 / 1:3 / 1:4 每节课多少钱）。
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">场地</h2>
        <form action={createVenue} className="mt-4 grid gap-3 sm:grid-cols-5">
          <input
            name="venueName"
            placeholder="场地名称（例如：XX 体育馆）"
            className="sm:col-span-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          <input
            name="venueAddress"
            placeholder="地址（可选）"
            className="sm:col-span-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
            添加
          </button>
        </form>

        <div className="mt-5 divide-y divide-zinc-100 rounded-xl border border-zinc-100">
          {(venues ?? []).length === 0 ? (
            <div className="p-4 text-sm text-zinc-600">还没有场地。</div>
          ) : (
            (venues ?? []).map((v) => (
              <div key={v.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">
                    {v.name}
                  </div>
                  {v.address && (
                    <div className="truncate text-xs text-zinc-500">
                      {v.address}
                    </div>
                  )}
                </div>
                <form action={deleteVenue}>
                  <input type="hidden" name="id" value={v.id} />
                  <button className="text-sm text-zinc-600 hover:text-zinc-900">
                    删除
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">上课模式价格</h2>
        <p className="mt-1 text-xs text-zinc-500">
          价格单位：人民币/每节课（会存为分）。
        </p>

        <div className="mt-4 grid gap-3">
          {["1:1", "1:2", "1:3", "1:4"].map((code) => {
            const existing = (modes ?? []).find((m) => m.code === code);
            const price =
              existing?.default_price_cents != null
                ? (existing.default_price_cents / 100).toFixed(0)
                : "";
            const label =
              existing?.label ??
              (code === "1:1"
                ? "一对一"
                : code === "1:2"
                  ? "一对二"
                  : code === "1:3"
                    ? "一对三"
                    : "一对四");

            return (
              <form
                key={code}
                action={upsertLessonMode}
                className="grid items-center gap-3 rounded-xl border border-zinc-200 p-4 sm:grid-cols-5"
              >
                <input type="hidden" name="code" value={code} />
                <div className="text-sm font-medium text-zinc-900">{code}</div>
                <input
                  name="label"
                  defaultValue={label}
                  className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                />
                <input
                  name="price"
                  defaultValue={price}
                  placeholder="价格"
                  className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  inputMode="numeric"
                />
                <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
                  保存
                </button>
              </form>
            );
          })}
        </div>
      </section>
    </div>
  );
}

