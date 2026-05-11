import { isPgRestMissingColumn } from "@/lib/session-queries";

const PAID_STORAGE_BUCKET = "app-data";
const PAID_STORAGE_OBJECT = "session-student-paid.json";

export type SessionStudentKey = {
  sessionId: string;
  studentId: string;
};

export function sessionStudentKey({ sessionId, studentId }: SessionStudentKey) {
  return `${sessionId}:${studentId}`;
}

let paidColumnAvailable: boolean | null = null;

export async function sessionStudentPaidColumnAvailable(supabase: any): Promise<boolean> {
  if (paidColumnAvailable != null) return paidColumnAvailable;
  const result = await supabase.from("session_students").select("paid").limit(1);
  if (!result.error) {
    paidColumnAvailable = true;
    return true;
  }
  if (isPgRestMissingColumn(result.error, "paid")) {
    paidColumnAvailable = false;
    return false;
  }
  paidColumnAvailable = true;
  return true;
}

function paidStoragePath(userId: string) {
  return `${userId}/${PAID_STORAGE_OBJECT}`;
}

async function readPaidStorageMap(supabase: any, userId: string): Promise<Record<string, boolean>> {
  const { data, error } = await supabase.storage.from(PAID_STORAGE_BUCKET).download(paidStoragePath(userId));
  if (error || !data) return {};
  try {
    const raw = await data.text();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === "string" && typeof value === "boolean") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

async function writePaidStorageMap(
  supabase: any,
  userId: string,
  map: Record<string, boolean>,
): Promise<{ ok: boolean; message?: string }> {
  const body = JSON.stringify(map);
  const { error } = await supabase.storage.from(PAID_STORAGE_BUCKET).upload(paidStoragePath(userId), body, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) {
    return { ok: false, message: String((error as { message?: string }).message ?? "保存收费状态失败。") };
  }
  return { ok: true };
}

export async function readSessionStudentPaidMap(
  supabase: any,
  userId: string,
): Promise<Record<string, boolean>> {
  const map = await readPaidStorageMap(supabase, userId);
  if (!(await sessionStudentPaidColumnAvailable(supabase))) return map;

  const { data, error } = await supabase
    .from("session_students")
    .select("session_id,student_id,paid");
  if (error || !Array.isArray(data)) return map;

  for (const row of data) {
    const sessionId = String((row as { session_id?: string }).session_id ?? "");
    const studentId = String((row as { student_id?: string }).student_id ?? "");
    if (!sessionId || !studentId) continue;
    map[sessionStudentKey({ sessionId, studentId })] = Boolean(
      (row as { paid?: boolean | null }).paid,
    );
  }
  return map;
}

export async function setSessionStudentPaid(
  supabase: any,
  userId: string,
  key: SessionStudentKey,
  paid: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const mapKey = sessionStudentKey(key);
  if (await sessionStudentPaidColumnAvailable(supabase)) {
    const { error } = await supabase
      .from("session_students")
      .update({ paid })
      .eq("session_id", key.sessionId)
      .eq("student_id", key.studentId);
    if (!error) return { ok: true };
    if (!isPgRestMissingColumn(error, "paid")) {
      return { ok: false, message: String((error as { message?: string }).message ?? "更新失败。") };
    }
    paidColumnAvailable = false;
  }

  const map = await readPaidStorageMap(supabase, userId);
  if (paid) map[mapKey] = true;
  else delete map[mapKey];
  return writePaidStorageMap(supabase, userId, map);
}

export function applyPaidMapToRows<T extends { key: string; paid: boolean }>(
  rows: T[],
  paidMap: Record<string, boolean>,
): T[] {
  return rows.map((row) => ({
    ...row,
    paid: paidMap[row.key] ?? row.paid,
  }));
}
