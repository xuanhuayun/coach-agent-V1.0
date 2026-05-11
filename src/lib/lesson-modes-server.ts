import { LESSON_MODE_DEFINITIONS } from "@/lib/lesson-mode";
import { isPgRestMissingColumn } from "@/lib/session-queries";

const LESSON_MODE_LIST_SELECT = "id,code,label,default_price_cents,default_duration_hours";
const LESSON_MODE_LIST_SELECT_COMPAT = "id,code,label,default_price_cents";
const LESSON_MODE_SNAPSHOT_SELECT = "code,default_price_cents,default_duration_hours";
const LESSON_MODE_SNAPSHOT_SELECT_COMPAT = "code,default_price_cents";

export type LessonModeListRow = {
  id: string;
  code: string;
  label: string;
  default_price_cents: number;
  default_duration_hours?: number | null;
};

export type LessonModeSnapshotRow = {
  code: string;
  default_price_cents: number;
  default_duration_hours?: number | null;
};

export async function listLessonModes(supabase: any): Promise<LessonModeListRow[]> {
  let result = await supabase
    .from("lesson_modes")
    .select(LESSON_MODE_LIST_SELECT)
    .order("code", { ascending: true });
  if (result.error && isPgRestMissingColumn(result.error, "default_duration_hours")) {
    result = await supabase
      .from("lesson_modes")
      .select(LESSON_MODE_LIST_SELECT_COMPAT)
      .order("code", { ascending: true });
  }
  return Array.isArray(result.data) ? (result.data as LessonModeListRow[]) : [];
}

export async function fetchLessonModeById(
  supabase: any,
  modeId: string,
): Promise<{ data: LessonModeSnapshotRow | null; error: unknown }> {
  let result = await supabase
    .from("lesson_modes")
    .select(LESSON_MODE_SNAPSHOT_SELECT)
    .eq("id", modeId)
    .single();
  if (result.error && isPgRestMissingColumn(result.error, "default_duration_hours")) {
    result = await supabase
      .from("lesson_modes")
      .select(LESSON_MODE_SNAPSHOT_SELECT_COMPAT)
      .eq("id", modeId)
      .single();
  }
  return { data: (result.data as LessonModeSnapshotRow | null) ?? null, error: result.error };
}

export async function ensureLessonModes(supabase: any, userId: string) {
  const { data: existing } = await supabase.from("lesson_modes").select("id,code");
  const byCode = new Map<string, { id: string; code: string }>(
    (existing ?? []).map((row: { id: string; code: string }) => [row.code, row]),
  );

  for (const def of LESSON_MODE_DEFINITIONS) {
    const row = byCode.get(def.code);
    if (!row) {
      const insertRow: Record<string, unknown> = {
        user_id: userId,
        code: def.code,
        label: def.labelZh,
        default_price_cents: def.defaultPriceCents,
        default_duration_hours: def.durationHours,
      };
      let result = await supabase.from("lesson_modes").insert(insertRow);
      if (result.error && isPgRestMissingColumn(result.error, "default_duration_hours")) {
        const { default_duration_hours: _removed, ...rest } = insertRow;
        result = await supabase.from("lesson_modes").insert(rest);
      }
      continue;
    }

    const patch: Record<string, unknown> = {
      label: def.labelZh,
      default_duration_hours: def.durationHours,
    };
    let result = await supabase.from("lesson_modes").update(patch).eq("id", row.id);
    if (result.error && isPgRestMissingColumn(result.error, "default_duration_hours")) {
      const { default_duration_hours: _removed, ...rest } = patch;
      result = await supabase.from("lesson_modes").update(rest).eq("id", row.id);
    }
  }
}
