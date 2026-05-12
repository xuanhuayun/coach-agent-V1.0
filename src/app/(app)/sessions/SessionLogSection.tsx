import { sortLessonModes } from "@/lib/lesson-mode";
import { ensureLessonModes, listLessonModes } from "@/lib/lesson-modes-server";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { SessionLogPanel } from "./SessionLogPanel";

export async function SessionLogSection() {
  const { supabase, user } = await requireUser();
  await ensureLessonModes(supabase, user.id);
  const lang = await getLang();

  const [{ data: venues }, modesRaw, { data: students }] = await Promise.all([
    supabase.from("venues").select("id,name").order("created_at", { ascending: false }),
    listLessonModes(supabase),
    supabase.from("students").select("id,name").order("created_at", { ascending: false }),
  ]);
  const modes = sortLessonModes(modesRaw);

  return (
    <SessionLogPanel
      lang={lang}
      venues={venues ?? []}
      modes={modes ?? []}
      students={(students ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))}
    />
  );
}
