import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { InfoTip } from "@/components/InfoTip";
import { parseSgdInput } from "@/lib/money";
import { toastUrl } from "@/lib/toast";
import { lessonModeDefinitionByCode, sortLessonModes } from "@/lib/lesson-mode";
import { ensureLessonModes, listLessonModes } from "@/lib/lesson-modes-server";
import { isPgRestMissingColumn } from "@/lib/session-queries";
import { SettingsActionsClient } from "./SettingsActionsClient";

async function createVenue(formData: FormData) {
  "use server";
  const name = String(formData.get("venueName") ?? "").trim();
  const address = String(formData.get("venueAddress") ?? "").trim();
  if (!name) redirect(toastUrl("/settings", "error", "场地名称必填。"));

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("venues").insert({
    user_id: user.id,
    name,
    address: address || null,
  });
  if (error) {
    const msg = String((error as any)?.message ?? "");
    const code = String((error as any)?.code ?? "");
    if (code === "23505" || msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
      redirect(toastUrl("/settings", "error", "添加失败：这个场地名称已存在。"));
    }
    if (msg.toLowerCase().includes("row-level security") || msg.toLowerCase().includes("permission")) {
      redirect(toastUrl("/settings", "error", "添加失败：权限不足（RLS）。请确认已登录且策略已启用。"));
    }
    redirect(toastUrl("/settings", "error", `添加失败：${msg || "请稍后重试。"}`));
  }
  revalidatePath("/settings");
  redirect(toastUrl("/settings", "success", "已添加。"));
}

async function deleteVenue(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) redirect(toastUrl("/settings", "error", "删除失败。"));
  const { supabase } = await requireUser();

  const { data: anySession } = await supabase
    .from("sessions")
    .select("id")
    .eq("venue_id", id)
    .limit(1);
  if ((anySession ?? []).length > 0) {
    redirect(toastUrl("/settings", "error", "这个场地已经被约过/上过课，不能删除。"));
  }

  const { error } = await supabase.from("venues").delete().eq("id", id);
  if (error) redirect(toastUrl("/settings", "error", "删除失败，请稍后重试。"));
  revalidatePath("/settings");
  redirect(toastUrl("/settings", "success", "已删除。"));
}

async function upsertLessonMode(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim();
  const price = parseSgdInput(String(formData.get("price") ?? ""));
  if (!code || price == null) {
    redirect(toastUrl("/settings", "error", "价格格式不正确。"));
  }

  const def = lessonModeDefinitionByCode(code);
  const fixedLabel = def ? def.labelZh : code;

  const { supabase, user } = await requireUser();
  const row: Record<string, unknown> = {
    user_id: user.id,
    code,
    label: fixedLabel,
    default_price_cents: Math.round(price * 100),
  };
  if (def) row.default_duration_hours = def.durationHours;
  let { error } = await supabase.from("lesson_modes").upsert(row, { onConflict: "user_id,code" });
  if (error && row.default_duration_hours != null && isPgRestMissingColumn(error, "default_duration_hours")) {
    const { default_duration_hours: _removed, ...rest } = row;
    ({ error } = await supabase.from("lesson_modes").upsert(rest, { onConflict: "user_id,code" }));
  }
  if (error) redirect(toastUrl("/settings", "error", "保存失败，请稍后重试。"));
  revalidatePath("/settings");
  redirect(toastUrl("/settings", "success", "保存成功。"));
}

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  await ensureLessonModes(supabase, user.id);
  const lang = await getLang();
  const d = dict[lang];

  const [{ data: venues }, modesRaw] = await Promise.all([
    supabase.from("venues").select("*").order("created_at", { ascending: false }),
    listLessonModes(supabase),
  ]);
  const modes = sortLessonModes(modesRaw);

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">{d.nav_settings}</h1>
          <InfoTip text={`${d.currencyHint} · ${d.pricePerPerson}`} />
        </div>
      </div>

      <SettingsActionsClient
        lang={lang}
        venues={(venues ?? []).map((v: any) => ({ id: v.id, name: v.name, address: v.address ?? null }))}
        modes={(modes ?? []).map((m: any) => ({ id: m.id, code: m.code, default_price_cents: m.default_price_cents }))}
        createVenue={createVenue}
        deleteVenue={deleteVenue}
        upsertLessonMode={upsertLessonMode}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">{d.language}</h2>
            <InfoTip
              side="top"
              text={
                lang === "zh"
                  ? "切换一次就会记住（保存在浏览器里），不用每次都调。"
                  : "Saved in a browser cookie."
              }
            />
          </div>
          <LangToggle value={lang} />
        </div>
      </section>

      <div className="pt-2 text-xs text-slate-500">
        {lang === "zh"
          ? "有其他需求或问题，可以联系管理员 8193 4087。"
          : "For questions or requests, contact admin: 8193 4087."}
      </div>
    </div>
  );
}

